use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TunnelEntry {
    pub id: String,                      // "tun-1727731200000"
    pub port: u16,                       // 4500
    pub public_url: String,              // "https://px-dfcb43c.proxync.dev"
    pub provider: String,                // "native" | "cloudflare" | "relay"
    pub pid: u32,                        // OS process ID — used to check if still alive
    pub started_at: String,              // ISO 8601 string
    pub started_epoch_secs: u64,         // Unix epoch seconds — enables 1-line zero-dependency elapsed time!
    pub expires_at: Option<String>,      // None = no expiry; Some("30m") = duration string
    pub expires_epoch_secs: Option<u64>, // Epoch seconds when tunnel should auto-expire
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub routes: Option<Vec<String>>,     // e.g. ["/:4000", "/node:5002"]
}

/// Returns path to the registry file.
/// Uses get_base_data_dir() so data lands in the SAME folder as app.log, data.json
/// (e.g. %APPDATA%\Proxync\tunnels.json on Windows, ~/.config/Proxync/tunnels.json on Unix)
/// This ensures GUI and CLI share a consistent data root.
pub fn registry_path() -> PathBuf {
    let mut dir = crate::storage::get_base_data_dir();
    dir.push("tunnels.json");
    dir
}

pub fn is_process_alive(pid: u32) -> bool {
    if pid == 0 {
        return false;
    }
    if pid == std::process::id() {
        return true;
    }

    // ponytail: tasklist subprocess check on Windows — acceptable for single-user CLI with <10 tunnels.
    // Upgrade: query process status via OpenProcess/windows-sys if latency is measured >300ms.
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("tasklist");
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: prevent console flicker
        cmd.args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"]);
        if let Ok(out) = cmd.output() {
            let s = String::from_utf8_lossy(&out.stdout);
            return s.contains(&format!("\"{}\"", pid));
        }
        false
    }
    #[cfg(not(target_os = "windows"))]
    {
        let status = std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        status.map(|s| s.success()).unwrap_or(false)
    }
}

/// Read all active tunnel entries (validates PID liveness, auto-pruning dead entries from disk)
pub fn read_registry() -> Vec<TunnelEntry> {
    let path = registry_path();
    if !path.exists() {
        return Vec::new();
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Warning: failed to read tunnel registry {:?}: {}", path, e);
            return Vec::new();
        }
    };
    let entries: Vec<TunnelEntry> = match serde_json::from_str(&content) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("Warning: corrupt tunnel registry at {:?}: {}", path, e);
            return Vec::new();
        }
    };

    // Partition entries by process liveness. Stale entries are pruned automatically.
    let (live, stale): (Vec<_>, Vec<_>) = entries.into_iter().partition(|t| is_process_alive(t.pid));
    if !stale.is_empty() {
        let _ = write_registry_atomic(&live);
    }
    live
}

fn write_registry_atomic(entries: &[TunnelEntry]) -> Result<(), String> {
    let path = registry_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    let temp_path = path.with_extension(format!("tmp-{}", std::process::id()));
    fs::write(&temp_path, &json).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        // ponytail: TOCTOU window between remove_file and rename on Windows — acceptable for single-user CLI.
        if path.exists() {
            let _ = fs::remove_file(&path);
        }
    }

    fs::rename(&temp_path, &path).map_err(|e| {
        // Clean up temp file so it doesn't accumulate on rename failure
        let _ = fs::remove_file(&temp_path);
        e.to_string()
    })
}

/// Add a tunnel entry on start (overwrites any stale entry on same id or dead port)
pub fn register_tunnel(entry: &TunnelEntry) -> Result<(), String> {
    let mut entries = read_registry();
    entries.retain(|t| t.id != entry.id && (t.port != entry.port || is_process_alive(t.pid)));
    entries.push(entry.clone());
    write_registry_atomic(&entries)
}

/// Remove a tunnel entry on stop / Ctrl+C
pub fn unregister_tunnel(id: &str) -> Result<(), String> {
    let mut entries = read_registry();
    let initial_len = entries.len();
    entries.retain(|t| t.id != id);
    if entries.len() != initial_len {
        write_registry_atomic(&entries)?;
    }
    Ok(())
}

impl TunnelEntry {
    /// Returns true if `port` matches either the primary port or any routed port in `routes`.
    pub fn matches_port(&self, port: u16) -> bool {
        if self.port == port {
            return true;
        }
        if let Some(ref routes) = self.routes {
            return routes.iter().any(|r| {
                r.rsplit(':')
                    .next()
                    .and_then(|p| p.parse::<u16>().ok())
                    .map(|p| p == port)
                    .unwrap_or(false)
            });
        }
        false
    }

    /// Returns the public URL for `port`, appending the routed subpath if `port` is a secondary service.
    pub fn public_url_for_port(&self, port: u16) -> String {
        if self.port != port {
            if let Some(ref routes) = self.routes {
                for r in routes {
                    if let Some((pfx, pt_str)) = r.rsplit_once(':') {
                        if pt_str.parse::<u16>().ok() == Some(port) && pfx != "/" {
                            let base = self.public_url.trim_end_matches('/');
                            let clean_pfx = if pfx.starts_with('/') { pfx.to_string() } else { format!("/{}", pfx) };
                            return format!("{}{}", base, clean_pfx);
                        }
                    }
                }
            }
        }
        self.public_url.clone()
    }
}

/// Check if a live tunnel already exists for this port (either as primary port or inside routes)
pub fn find_tunnel_by_port(port: u16) -> Option<TunnelEntry> {
    read_registry().into_iter().find(|t| t.matches_port(port))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tunnel_entry_routes_serialization() {
        let entry = TunnelEntry {
            id: "tun-test-1".into(),
            port: 4000,
            public_url: "https://px-test.proxync.dev".into(),
            provider: "native".into(),
            pid: 1234,
            started_at: "2026-11-24T00:00:00Z".into(),
            started_epoch_secs: 1700000000,
            expires_at: Some("1h".into()),
            expires_epoch_secs: Some(1700003600),
            routes: Some(vec!["/:4000".into(), "/node:5002".into()]),
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"routes\":[\"/:4000\",\"/node:5002\"]"));

        let deserialized: TunnelEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.port, 4000);
        assert_eq!(deserialized.routes.as_ref().unwrap().len(), 2);
        assert!(deserialized.matches_port(4000));
        assert!(deserialized.matches_port(5002));
        assert!(!deserialized.matches_port(8080));
        assert_eq!(deserialized.public_url_for_port(4000), "https://px-test.proxync.dev");
        assert_eq!(deserialized.public_url_for_port(5002), "https://px-test.proxync.dev/node");
    }
}
