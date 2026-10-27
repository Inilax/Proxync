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

/// Check if a live tunnel already exists for this port
pub fn find_tunnel_by_port(port: u16) -> Option<TunnelEntry> {
    read_registry().into_iter().find(|t| t.port == port)
}
