use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use base64::Engine;
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliStatus {
    pub is_installed: bool,
    pub binary_path: Option<String>,
    pub install_dir: String,
    pub in_path: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliUpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes_url: String,
    pub is_newer: bool,
}

pub fn get_cli_asset_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "proxync-windows-x86_64.exe"
    }
    #[cfg(target_os = "macos")]
    {
        "proxync-darwin-universal.tar.gz"
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        "proxync-linux-x86_64.tar.gz"
    }
}

/// Recursively removes stale .old and .tmp binaries left behind by updates
pub fn cleanup_old_binaries(dir: &Path) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.ends_with(".old")
                    || name.ends_with(".tmp")
                    || name.contains(".old-")
                    || name.contains(".tmp-")
                    || name.contains(".exe.old")
                    || name.contains(".exe.tmp")
                    || name.contains("archive-")
                {
                    let _ = std::fs::remove_file(&path);
                } else if name.contains("extract-") && path.is_dir() {
                    let _ = std::fs::remove_dir_all(&path);
                }
            }
        }
    }
}

/// Compares two semver strings (e.g. "0.2.5" vs "0.2.4" or "v0.2.5" vs "v0.2.4")
pub fn is_newer_version(latest_tag: &str, current_tag: &str) -> bool {
    let parse_parts = |tag: &str| -> Vec<u64> {
        let clean = tag.trim().trim_start_matches('v').trim_start_matches('V');
        clean
            .split(|c: char| c == '.' || c == '-' || c == '+')
            .filter_map(|p| p.parse::<u64>().ok())
            .collect()
    };

    let latest_parts = parse_parts(latest_tag);
    let current_parts = parse_parts(current_tag);

    for (l, c) in latest_parts.iter().zip(current_parts.iter()) {
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }

    latest_parts.len() > current_parts.len()
}

/// Resolves standard OS-specific installation directory for the Proxync CLI
pub fn get_default_cli_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            PathBuf::from(local_app_data).join("Programs").join("Proxync").join("bin")
        } else if let Ok(user_profile) = std::env::var("USERPROFILE") {
            PathBuf::from(user_profile).join("AppData").join("Local").join("Programs").join("Proxync").join("bin")
        } else {
            PathBuf::from(r"C:\ProgramData\Proxync\bin")
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = std::env::var("HOME") {
            PathBuf::from(home).join(".local").join("bin")
        } else {
            PathBuf::from("/usr/local/bin")
        }
    }
}

fn is_same_path(path_a: &Path, path_b: &Path) -> bool {
    if let (Ok(can_a), Ok(can_b)) = (path_a.canonicalize(), path_b.canonicalize()) {
        can_a == can_b
    } else {
        path_a == path_b
    }
}

fn is_desktop_binary(path: &Path, current_exe: Option<&Path>) -> bool {
    if let Some(curr) = current_exe {
        if is_same_path(path, curr) {
            return true;
        }
    }

    let s = path.to_string_lossy().to_lowercase();
    let s_norm = s.replace('\\', "/");
    if s_norm.contains("src-tauri")
        || s_norm.contains("packages/desktop")
        || s_norm.contains("proxync-desktop")
        || s_norm == "/usr/bin/proxync"
        || s_norm == "/bin/proxync"
        || s_norm.starts_with("/opt/proxync")
        || s_norm.contains(".app/contents/macos")
        || s_norm.contains("program files/proxync")
        || s_norm.contains("program files (x86)/proxync")
        || (s_norm.ends_with("proxync/proxync.exe") && !s_norm.contains("/bin/"))
    {
        return true;
    }

    // Binary content inspection: check for GUI / Tauri dependencies in the first 256 KB.
    // Protects against cases where the desktop app was erroneously copied or symlinked into ~/.local/bin/proxync
    if let Ok(mut f) = std::fs::File::open(path) {
        use std::io::Read;
        let mut buffer = [0u8; 256 * 1024];
        if let Ok(n) = f.read(&mut buffer) {
            let slice = &buffer[..n];
            let gui_markers: &[&[u8]] = &[
                b"libgtk",
                b"webkit",
                b"wry-",          // Tauri WebView crate dependency string; eliminates 3-byte false-positive hazard
                b"tauri-plugin",
                b"WebView2Loader",
                b"com.proxync.app",
            ];
            for marker in gui_markers {
                if slice.windows(marker.len()).any(|w| w.eq_ignore_ascii_case(marker)) {
                    return true;
                }
            }
        }
    }

    false
}

/// Checks if the Proxync CLI binary is installed and whether it is discoverable in PATH
pub fn check_cli_status() -> CliStatus {
    let install_dir = get_default_cli_dir();
    let bin_name = if cfg!(target_os = "windows") { "proxync.exe" } else { "proxync" };
    let expected_binary = install_dir.join(bin_name);

    let current_exe = std::env::current_exe().ok();

    // 1. Check if it exists in the standard install directory (and is NOT a copied GUI binary)
    let mut binary_path = if expected_binary.is_file() && !is_desktop_binary(&expected_binary, current_exe.as_deref()) {
        Some(expected_binary.to_string_lossy().to_string())
    } else {
        None
    };

    // 2. Check if any genuine CLI binary is reachable via system PATH
    let mut in_path = false;
    if let Some(path_var) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(bin_name);
            if candidate.is_file() {
                // Ignore any desktop GUI binary or active GUI process
                if is_desktop_binary(&candidate, current_exe.as_deref()) {
                    continue;
                }

                in_path = true;
                if binary_path.is_none() {
                    binary_path = Some(candidate.to_string_lossy().to_string());
                }
                break;
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix, also verify /usr/local/bin/proxync explicitly
        let usr_local = Path::new("/usr/local/bin").join(bin_name);
        if usr_local.is_file() && !is_desktop_binary(&usr_local, current_exe.as_deref()) {
            in_path = true;
            if binary_path.is_none() {
                binary_path = Some(usr_local.to_string_lossy().to_string());
            }
        }
    }

    let is_installed = binary_path.is_some();

    CliStatus {
        is_installed,
        binary_path: if is_installed { binary_path } else { None },
        install_dir: install_dir.to_string_lossy().to_string(),
        in_path,
    }
}

/// Discovers candidate source CLI binaries from app bundle, current exe folder, or dev target
pub fn find_source_cli_binary() -> Option<PathBuf> {
    let bin_name = if cfg!(target_os = "windows") { "proxync.exe" } else { "proxync" };
    let current_exe = std::env::current_exe().ok();

    // 1. Walk up from current_dir to locate the repo/workspace root and find packages/cli/target/{release,debug}
    if let Ok(cwd) = std::env::current_dir() {
        let mut curr: Option<&Path> = Some(&cwd);
        while let Some(dir) = curr {
            let release = dir.join("packages").join("cli").join("target").join("release").join(bin_name);
            let debug = dir.join("packages").join("cli").join("target").join("debug").join(bin_name);
            let rel_valid = release.is_file() && !is_desktop_binary(&release, current_exe.as_deref());
            let dbg_valid = debug.is_file() && !is_desktop_binary(&debug, current_exe.as_deref());

            if rel_valid && dbg_valid {
                let rel_time = std::fs::metadata(&release).and_then(|m| m.modified()).ok();
                let dbg_time = std::fs::metadata(&debug).and_then(|m| m.modified()).ok();
                if let (Some(rt), Some(dt)) = (rel_time, dbg_time) {
                    if dt > rt {
                        return Some(debug);
                    }
                }
                return Some(release);
            } else if rel_valid {
                return Some(release);
            } else if dbg_valid {
                return Some(debug);
            }
            curr = dir.parent();
        }
    }

    // 2. If current_exe is already the standalone proxync binary, use it directly
    if let Some(ref exe_path) = current_exe {
        if exe_path.is_file() && !is_desktop_binary(exe_path, None) {
            let is_match = exe_path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|name| name.eq_ignore_ascii_case(bin_name))
                .unwrap_or(false);
            if is_match {
                return Some(exe_path.clone());
            }
        }
    }

    // 3. Walk up from current_exe to locate packaged resources, bin, or dev targets
    if let Some(ref exe_path) = current_exe {
        let mut curr: Option<&Path> = exe_path.parent();
        while let Some(parent) = curr {
            // Never treat system root or system prefix folders as application bundle parents
            if parent == Path::new("/") 
                || parent == Path::new("/usr") 
                || parent == Path::new("/usr/bin")
                || parent == Path::new("/usr/local")
                || parent == Path::new("/usr/local/bin")
                || parent == Path::new("/bin")
                || parent == Path::new("/sbin")
                || parent.parent().is_none()
            {
                curr = parent.parent();
                continue;
            }

            // Check packaged app layouts:
            // Windows/Linux installed layout: <InstallDir>/bin/proxync.exe
            let sub_bin = parent.join("bin").join(bin_name);
            if sub_bin.is_file() && !is_desktop_binary(&sub_bin, Some(exe_path)) {
                return Some(sub_bin);
            }
            // macOS bundle layout: Proxync.app/Contents/Resources/bin/proxync
            let mac_res = parent.join("Resources").join("bin").join(bin_name);
            if mac_res.is_file() && !is_desktop_binary(&mac_res, Some(exe_path)) {
                return Some(mac_res);
            }
            let mac_res2 = parent.join("../Resources/bin").join(bin_name);
            if mac_res2.is_file() && !is_desktop_binary(&mac_res2, Some(exe_path)) {
                return Some(mac_res2);
            }
            // Development workspace layouts:
            let dev_cli_release = parent.join("packages").join("cli").join("target").join("release").join(bin_name);
            let dev_cli_debug = parent.join("packages").join("cli").join("target").join("debug").join(bin_name);
            let rel_valid = dev_cli_release.is_file() && !is_desktop_binary(&dev_cli_release, Some(exe_path));
            let dbg_valid = dev_cli_debug.is_file() && !is_desktop_binary(&dev_cli_debug, Some(exe_path));

            if rel_valid && dbg_valid {
                let rel_time = std::fs::metadata(&dev_cli_release).and_then(|m| m.modified()).ok();
                let dbg_time = std::fs::metadata(&dev_cli_debug).and_then(|m| m.modified()).ok();
                if let (Some(rt), Some(dt)) = (rel_time, dbg_time) {
                    if dt > rt {
                        return Some(dev_cli_debug);
                    }
                }
                return Some(dev_cli_release);
            } else if rel_valid {
                return Some(dev_cli_release);
            } else if dbg_valid {
                return Some(dev_cli_debug);
            }

            curr = parent.parent();
        }
    }

    None
}

/// Checks GitHub releases to determine if a newer version of the CLI is available.
/// Reads the shared static latest.json metadata (same file used by desktop GUI updater) to eliminate rate limits.
pub async fn check_for_cli_update(current_version: &str) -> Result<Option<CliUpdateInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .user_agent(format!("proxync-cli/{}", current_version))
        .build()
        .map_err(|e| format!("HTTP client init failed: {}", e))?;

    // 1. Primary: check shared static latest.json published with the release (zero rate limits)
    let latest_json_url = "https://github.com/Inilax/Proxync/releases/latest/download/latest.json";
    let mut resolved_tag: Option<String> = None;
    let mut resolved_url = "https://github.com/Inilax/Proxync/releases/latest".to_string();

    if let Ok(resp) = client.get(latest_json_url).send().await {
        if resp.status().is_success() {
            #[derive(Deserialize)]
            struct LatestJson {
                version: String,
            }
            if let Ok(lj) = resp.json::<LatestJson>().await {
                resolved_tag = Some(if lj.version.starts_with('v') { lj.version } else { format!("v{}", lj.version) });
            }
        }
    }

    // 2. Secondary fallback: check GitHub REST API
    if resolved_tag.is_none() {
        let api_url = "https://api.github.com/repos/Inilax/Proxync/releases/latest";
        if let Ok(resp) = client.get(api_url).send().await {
            if resp.status().is_success() {
                #[derive(Deserialize)]
                struct GhRelease {
                    tag_name: String,
                    html_url: Option<String>,
                }
                if let Ok(gh) = resp.json::<GhRelease>().await {
                    resolved_tag = Some(gh.tag_name);
                    if let Some(h) = gh.html_url {
                        resolved_url = h;
                    }
                }
            }
        }
    }

    // 3. Tertiary fallback: follow HTTP 302 redirect on releases/latest
    if resolved_tag.is_none() {
        if let Ok(resp) = client.get("https://github.com/Inilax/Proxync/releases/latest").send().await {
            let final_url = resp.url().as_str();
            if let Some(tag) = final_url.split("/tag/").nth(1) {
                resolved_tag = Some(tag.to_string());
                resolved_url = final_url.to_string();
            }
        }
    }

    let tag_name = match resolved_tag {
        Some(tag) => tag,
        None => return Ok(None),
    };
    let html_url = resolved_url;

    let latest_clean = tag_name.trim().trim_start_matches('v');
    let current_clean = current_version.trim().trim_start_matches('v');

    let asset_name = get_cli_asset_name();
    let download_url = format!(
        "https://github.com/Inilax/Proxync/releases/download/{}/{}",
        tag_name, asset_name
    );

    let is_newer = is_newer_version(latest_clean, current_clean);
    if is_newer {
        Ok(Some(CliUpdateInfo {
            current_version: current_version.to_string(),
            latest_version: tag_name,
            download_url,
            release_notes_url: html_url,
            is_newer: true,
        }))
    } else {
        Ok(None)
    }
}

/// Official Proxync Minisign public key (base64 of 32-byte Ed25519 public key)
pub const PROXYNC_MINISIGN_PUBKEY_RAW: &str = "RWRs5omD9gZF9Dhkawgys4QTJG5lgVc3l3gvoUdJeV+8u4tfRt3qmW0A";

/// Computes lowercase hex-encoded SHA-256 digest
pub fn compute_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Constant-time comparison between two hex strings to mitigate side-channel timing attacks
pub fn constant_time_eq_hex(a: &str, b: &str) -> bool {
    let a_clean = a.trim().to_ascii_lowercase();
    let b_clean = b.trim().to_ascii_lowercase();
    if a_clean.len() != b_clean.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a_clean.as_bytes().iter().zip(b_clean.as_bytes().iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Verifies a Minisign digital signature against the binary payload
pub fn verify_minisign_signature(bytes: &[u8], sig_content: &str) -> Result<(), String> {
    use minisign_verify::{PublicKey, Signature};

    let pk = PublicKey::from_base64(PROXYNC_MINISIGN_PUBKEY_RAW)
        .map_err(|e| format!("Invalid embedded Minisign public key: {}", e))?;

    let trimmed = sig_content.trim();
    let sig = if let Ok(s) = Signature::decode(trimmed) {
        s
    } else if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(trimmed) {
        let decoded_str = String::from_utf8_lossy(&decoded_bytes);
        Signature::decode(&decoded_str)
            .map_err(|e| format!("Failed to decode base64 Minisign signature: {}", e))?
    } else {
        return Err("Malformed Minisign signature format".to_string());
    };

    pk.verify(bytes, &sig, false)
        .map_err(|e| format!("Minisign digital signature verification failed: {}", e))
}

/// Verifies file headers and minimum size sanity to prevent corrupted downloads or web error page execution
pub fn verify_binary_magic(bytes: &[u8], is_archive: bool) -> Result<(), String> {
    // 1. Explicit check for common text/web error payloads (HTML, JSON errors, 404 text)
    let is_html_or_text_error = bytes.starts_with(b"<!DOCTYPE")
        || bytes.starts_with(b"<!doctype")
        || bytes.starts_with(b"<html")
        || bytes.starts_with(b"<HTML")
        || bytes.starts_with(b"404 Not Found")
        || bytes.starts_with(b"Not Found")
        || bytes.starts_with(b"{\"message\"")
        || bytes.starts_with(b"{\"error\"");

    if is_html_or_text_error {
        let sample_len = bytes.len().min(80);
        let sample = String::from_utf8_lossy(&bytes[..sample_len]);
        return Err(format!(
            "Downloaded payload is an HTML/HTTP error response, not an executable binary: '{}'",
            sample.trim()
        ));
    }

    if is_archive {
        if bytes.len() < 2 || bytes[0] != 0x1f || bytes[1] != 0x8b {
            return Err("Invalid archive format: expected gzip header magic (0x1F, 0x8B)".to_string());
        }
        return Ok(());
    }

    // Minimum size check for a standalone CLI binary (64 KB minimum threshold)
    if bytes.len() < 64 * 1024 {
        return Err(format!(
            "Binary payload is abnormally small ({} bytes); possible truncation or corrupted download",
            bytes.len()
        ));
    }

    #[cfg(target_os = "windows")]
    {
        // Windows PE executable starts with "MZ" (0x4D, 0x5A)
        if bytes.len() < 2 || bytes[0] != 0x4d || bytes[1] != 0x5a {
            return Err("Invalid Windows executable: missing DOS/PE 'MZ' header magic".to_string());
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux ELF executable starts with [0x7F, 'E', 'L', 'F']
        if bytes.len() < 4 || bytes[0] != 0x7f || &bytes[1..4] != b"ELF" {
            return Err("Invalid Linux executable: missing ELF header magic".to_string());
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Mach-O magics: 32-bit (0xFEEDFACE), 64-bit (0xFEEDFACF), Fat/Universal (0xCAFEBABE, 0xBEBAFECA),
        // or reverse-endian versions
        if bytes.len() < 4 {
            return Err("Invalid macOS executable: file too short for Mach-O header".to_string());
        }
        let magic = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
        let valid_magics = [
            0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca,
        ];
        if !valid_magics.contains(&magic) {
            return Err("Invalid macOS executable: missing Mach-O header magic".to_string());
        }
    }

    Ok(())
}

/// Verifies downloaded asset integrity via digital signature, SHA256SUMS, or GitHub release digest
pub async fn verify_download_integrity(
    client: &reqwest::Client,
    download_url: &str,
    asset_name: &str,
    bytes: &[u8],
) -> Result<String, String> {
    let computed_hash = compute_sha256(bytes);

    // 1. Primary: Check for official Minisign digital signature (${download_url}.sig)
    let sig_url = format!("{}.sig", download_url);
    if let Ok(resp) = client.get(&sig_url).send().await {
        if resp.status().is_success() {
            if let Ok(sig_text) = resp.text().await {
                verify_minisign_signature(bytes, &sig_text)?;
                return Ok(format!(
                    "Verified cryptographic Minisign signature (SHA-256: {})",
                    computed_hash
                ));
            }
        }
    }

    // 2. Secondary: Check for standalone asset checksum (${download_url}.sha256)
    let sha_url = format!("{}.sha256", download_url);
    if let Ok(resp) = client.get(&sha_url).send().await {
        if resp.status().is_success() {
            if let Ok(sha_text) = resp.text().await {
                let expected_hash = sha_text
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .trim();
                if constant_time_eq_hex(expected_hash, &computed_hash) {
                    return Ok(format!(
                        "Verified SHA-256 checksum from {}.sha256: {}",
                        asset_name, computed_hash
                    ));
                } else {
                    return Err(format!(
                        "SHA-256 checksum verification FAILED for {}: expected {}, computed {}",
                        asset_name, expected_hash, computed_hash
                    ));
                }
            }
        }
    }

    // 3. Tertiary: Check for repository-wide SHA256SUMS file in the release folder
    if let Some(base_url) = download_url.rsplit_once('/') {
        let sums_url = format!("{}/SHA256SUMS", base_url.0);
        if let Ok(resp) = client.get(&sums_url).send().await {
            if resp.status().is_success() {
                if let Ok(sums_text) = resp.text().await {
                    // Check if SHA256SUMS.minisig is also present to verify the manifest
                    let sums_sig_url = format!("{}/SHA256SUMS.minisig", base_url.0);
                    let mut is_manifest_signed = false;
                    if let Ok(sig_resp) = client.get(&sums_sig_url).send().await {
                        if sig_resp.status().is_success() {
                            if let Ok(sig_text) = sig_resp.text().await {
                                verify_minisign_signature(sums_text.as_bytes(), &sig_text)?;
                                is_manifest_signed = true;
                            }
                        }
                    }

                    for line in sums_text.lines() {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            let expected_hash = parts[0];
                            let file_entry = parts[1].trim_start_matches('*');
                            if file_entry == asset_name {
                                if constant_time_eq_hex(expected_hash, &computed_hash) {
                                    return Ok(format!(
                                        "Verified SHA-256 checksum from SHA256SUMS{} (SHA-256: {})",
                                        if is_manifest_signed { " [Minisign signature verified]" } else { "" },
                                        computed_hash
                                    ));
                                } else {
                                    return Err(format!(
                                        "SHA-256 checksum mismatch in SHA256SUMS for {}: expected {}, computed {}",
                                        asset_name, expected_hash, computed_hash
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Quaternary fallback: Query GitHub Release API asset digest
    let tag = if let Some(pos) = download_url.find("/releases/download/") {
        let after = &download_url[pos + "/releases/download/".len()..];
        after.split('/').next()
    } else {
        None
    };

    let gh_api_url = match tag {
        Some(t) => format!("https://api.github.com/repos/Inilax/Proxync/releases/tags/{}", t),
        None => "https://api.github.com/repos/Inilax/Proxync/releases/latest".to_string(),
    };

    if let Ok(resp) = client.get(&gh_api_url).send().await {
        if resp.status().is_success() {
            #[derive(Deserialize)]
            struct GhAsset {
                name: String,
                digest: Option<String>,
            }
            #[derive(Deserialize)]
            struct GhReleaseAssets {
                assets: Vec<GhAsset>,
            }
            if let Ok(rel) = resp.json::<GhReleaseAssets>().await {
                if let Some(asset) = rel.assets.iter().find(|a| a.name == asset_name) {
                    if let Some(ref d) = asset.digest {
                        let expected = d.strip_prefix("sha256:").unwrap_or(d.as_str());
                        if constant_time_eq_hex(expected, &computed_hash) {
                            return Ok(format!(
                                "Verified SHA-256 digest from GitHub Releases manifest: {}",
                                computed_hash
                            ));
                        } else {
                            return Err(format!(
                                "SHA-256 digest mismatch in GitHub Releases manifest: expected {}, computed {}",
                                expected, computed_hash
                            ));
                        }
                    }
                }
            }
        }
    }

    // Fail closed: Reject unverified binaries
    Err(format!(
        "Cryptographic integrity verification failed: no valid digital signature (.sig), SHA256SUMS, or verified digest could be obtained for '{}'. Aborting update for safety.",
        asset_name
    ))
}

/// Downloads a binary from `download_url`, verifies cryptographic signatures and checksums,
/// and atomically replaces `destination` with safe rollback & cleanup
pub async fn download_and_replace_binary(destination: &Path, download_url: &str) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        cleanup_old_binaries(parent);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("proxync-cli/updater")
        .build()
        .map_err(|e| format!("HTTP client init failed: {}", e))?;

    let resp = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with status HTTP {}", resp.status()));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read downloaded binary stream: {}", e))?;

    let is_tar_gz = download_url.ends_with(".tar.gz")
        || (bytes.len() >= 2 && bytes[0] == 0x1f && bytes[1] == 0x8b);

    // Stage 1: Sanity check: verify archive or executable magic bytes and minimum size
    verify_binary_magic(&bytes, is_tar_gz)?;

    // Stages 2 & 3: Cryptographic integrity check: verify Minisign signature, SHA-256 checksum, or GitHub release digest
    let asset_name = download_url
        .split('/')
        .last()
        .unwrap_or_else(|| get_cli_asset_name());
    let integrity_info = verify_download_integrity(&client, download_url, asset_name, &bytes).await?;
    println!("  ✓ {}", integrity_info);

    let temp_path = destination.with_extension(format!("tmp-{}", std::process::id()));

    #[cfg(target_os = "windows")]
    {
        std::fs::write(&temp_path, &bytes)
            .map_err(|e| format!("Failed to write temporary binary {}: {}", temp_path.display(), e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        if is_tar_gz {
            let temp_archive = destination.with_extension(format!("archive-{}.tar.gz", std::process::id()));
            std::fs::write(&temp_archive, &bytes)
                .map_err(|e| format!("Failed to write temporary archive {}: {}", temp_archive.display(), e))?;

            let extract_dir = destination.with_extension(format!("extract-{}", std::process::id()));
            let _ = std::fs::create_dir_all(&extract_dir);

            // Stage 4: Safe Sandbox Extraction — inspect archive TOC for Zip-Slip / Path Traversal before extraction
            let toc_output = std::process::Command::new("tar")
                .args(&["-ztf", &temp_archive.to_string_lossy()])
                .output()
                .map_err(|e| format!("Failed to inspect CLI archive contents: {}", e))?;

            if !toc_output.status.success() {
                let _ = std::fs::remove_file(&temp_archive);
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("Archive inspection failed: corrupted or invalid tar.gz".to_string());
            }

            let toc_listing = String::from_utf8_lossy(&toc_output.stdout);
            let mut found_proxync_binary = false;
            for line in toc_listing.lines() {
                let entry = line.trim();
                if entry.is_empty() {
                    continue;
                }
                // Zip-Slip protection: reject entries containing parent traversal or absolute root escapes
                if entry.contains("..") || entry.starts_with('/') || entry.starts_with('\\') {
                    let _ = std::fs::remove_file(&temp_archive);
                    let _ = std::fs::remove_dir_all(&extract_dir);
                    return Err(format!(
                        "Zip-Slip / Path Traversal security violation: malicious entry '{}' detected in archive",
                        entry
                    ));
                }
                let norm = entry.trim_start_matches("./");
                if norm == "proxync" {
                    found_proxync_binary = true;
                }
            }

            if !found_proxync_binary {
                let _ = std::fs::remove_file(&temp_archive);
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("Archive validation failed: 'proxync' binary not found in archive table of contents".to_string());
            }

            // Extract only the isolated binary into sandbox directory
            let status = std::process::Command::new("tar")
                .args(&[
                    "-xzf", &temp_archive.to_string_lossy(),
                    "-C", &extract_dir.to_string_lossy(),
                    "proxync",
                ])
                .status();

            let status = match status {
                Ok(s) if s.success() => Ok(s),
                _ => std::process::Command::new("tar")
                    .args(&["-xzf", &temp_archive.to_string_lossy(), "-C", &extract_dir.to_string_lossy()])
                    .status(),
            }
            .map_err(|e| format!("Failed to execute safe tar extraction: {}", e))?;

            let _ = std::fs::remove_file(&temp_archive);

            if !status.success() {
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("Failed to extract CLI archive with tar".to_string());
            }

            let extracted_bin = extract_dir.join("proxync");
            if !extracted_bin.is_file() {
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("CLI binary 'proxync' not found in extracted archive".to_string());
            }

            // Verify extracted binary is a regular file (not a malicious symlink) and did not escape sandbox
            if let Ok(meta) = std::fs::symlink_metadata(&extracted_bin) {
                if meta.file_type().is_symlink() {
                    let _ = std::fs::remove_dir_all(&extract_dir);
                    return Err("Security violation: extracted binary is a symlink, rejecting".to_string());
                }
            }

            if let (Ok(canon_bin), Ok(canon_dir)) = (extracted_bin.canonicalize(), extract_dir.canonicalize()) {
                if !canon_bin.starts_with(&canon_dir) {
                    let _ = std::fs::remove_dir_all(&extract_dir);
                    return Err("Security violation: extracted binary escaped sandbox extraction directory".to_string());
                }
            }

            // Verify extracted binary executable format (ELF or Mach-O)
            let extracted_bytes = std::fs::read(&extracted_bin)
                .map_err(|e| format!("Failed to read extracted binary for validation: {}", e))?;
            verify_binary_magic(&extracted_bytes, false)
                .map_err(|e| {
                    let _ = std::fs::remove_dir_all(&extract_dir);
                    format!("Extracted binary failed executable header validation: {}", e)
                })?;

            std::fs::copy(&extracted_bin, &temp_path)
                .map_err(|e| format!("Failed to copy extracted binary: {}", e))?;
            let _ = std::fs::remove_dir_all(&extract_dir);
        } else {
            std::fs::write(&temp_path, &bytes)
                .map_err(|e| format!("Failed to write temporary binary {}: {}", temp_path.display(), e))?;
        }

        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&temp_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&temp_path, perms);
        }
    }

    // Stage 5: Atomic Swap & Rollback
    if destination.exists() {
        #[cfg(target_os = "windows")]
        {
            let old_path = destination.with_extension(format!("old-{}", std::process::id()));
            let _ = std::fs::remove_file(&old_path);
            std::fs::rename(destination, &old_path)
                .map_err(|e| format!("Failed to rotate running binary on Windows: {}", e))?;
            
            if let Err(e) = std::fs::rename(&temp_path, destination) {
                // Rollback if renaming new binary failed
                let _ = std::fs::rename(&old_path, destination);
                return Err(format!("Failed to move new binary into place (safely restored previous binary): {}", e));
            }

            // Try removing the old binary immediately
            if std::fs::remove_file(&old_path).is_err() {
                use std::os::windows::process::CommandExt;
                let del_cmd = format!("ping 127.0.0.1 -n 2 > nul & del /f /q \"{}\"", old_path.display());
                let _ = std::process::Command::new("cmd")
                    .args(&["/C", &del_cmd])
                    .creation_flags(0x08000000)
                    .spawn();
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let old_path = destination.with_extension(format!("old-{}", std::process::id()));
            let _ = std::fs::remove_file(&old_path);
            if let Ok(_) = std::fs::copy(destination, &old_path) {
                if let Err(e) = std::fs::rename(&temp_path, destination) {
                    let _ = std::fs::rename(&old_path, destination);
                    return Err(format!("Failed to atomically replace binary (safely restored previous binary): {}", e));
                }
                let _ = std::fs::remove_file(&old_path);
            } else {
                std::fs::rename(&temp_path, destination)
                    .map_err(|e| format!("Failed to atomically replace binary: {}", e))?;
            }
        }
    } else {
        std::fs::rename(&temp_path, destination)
            .map_err(|e| format!("Failed to install binary: {}", e))?;
    }

    if let Some(parent) = destination.parent() {
        cleanup_old_binaries(parent);
    }

    Ok(())
}

/// Upgrades the currently executing CLI binary in-place with old binary cleanup
pub async fn self_update_cli(force: bool, current_version: &str) -> Result<String, String> {
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to locate currently running executable: {}", e))?;

    let update_info = check_for_cli_update(current_version).await?;

    match update_info {
        Some(info) => {
            // Downgrade protection: reject rollback to older versions unless explicitly forced
            if !force && !is_newer_version(&info.latest_version, current_version) {
                return Err(format!(
                    "Downgrade attack prevention: target version ({}) is not newer than current version ({}). Use --force if this rollback is intentional.",
                    info.latest_version, current_version
                ));
            }
            download_and_replace_binary(&current_exe, &info.download_url).await?;
            Ok(format!(
                "Successfully updated Proxync CLI: v{} -> {} ({})",
                current_version, info.latest_version, current_exe.display()
            ))
        }
        None => {
            if force {
                let asset = get_cli_asset_name();
                let url = format!("https://github.com/Inilax/Proxync/releases/latest/download/{}", asset);
                download_and_replace_binary(&current_exe, &url).await?;
                Ok(format!(
                    "Force re-installed latest Proxync CLI ({})",
                    current_exe.display()
                ))
            } else {
                Ok(format!("Proxync CLI is already up to date (v{})", current_version))
            }
        }
    }
}

/// Installs the Proxync CLI binary to the default OS directory and registers it to User PATH.
/// If no local build is found, automatically downloads the latest release binary on-demand.
pub async fn install_cli_to_path() -> Result<String, String> {
    let target_dir = get_default_cli_dir();
    std::fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create target directory: {}", e))?;
    cleanup_old_binaries(&target_dir);

    let bin_name = if cfg!(target_os = "windows") { "proxync.exe" } else { "proxync" };
    let destination = target_dir.join(bin_name);

    if let Some(source) = find_source_cli_binary() {
        if source != destination {
            #[cfg(target_os = "windows")]
            {
                let old_path = destination.with_extension(format!("old-{}", std::process::id()));
                let _ = std::fs::remove_file(&old_path);
                if destination.is_file() {
                    let _ = std::fs::rename(&destination, &old_path);
                }
            }
            std::fs::copy(&source, &destination)
                .map_err(|e| format!("Failed to copy CLI binary to {}: {}", destination.display(), e))?;
        }
    } else if !destination.is_file() || is_desktop_binary(&destination, std::env::current_exe().ok().as_deref()) {
        // Download from GitHub Releases on demand
        let asset = get_cli_asset_name();
        let fallback_url = format!("https://github.com/Inilax/Proxync/releases/latest/download/{}", asset);
        download_and_replace_binary(&destination, &fallback_url).await
            .map_err(|e| format!("Could not download Proxync CLI: {}. Please check your connection.", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Add target_dir to Windows User PATH via PowerShell.
        // ponytail: pass dir via process-isolated env var to eliminate any CWE-78 command injection.
        let mut cmd = std::process::Command::new("powershell");
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd.env("PROXYNC_INSTALL_DIR", &target_dir);
        let status = cmd
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command",
                "$dir = $env:PROXYNC_INSTALL_DIR; \
                 if ($dir) { \
                     $p = [Environment]::GetEnvironmentVariable('Path', 'User'); \
                     if ($p -notlike ('*' + $dir + '*')) { \
                         $newP = if ([string]::IsNullOrEmpty($p)) { $dir } else { ($p.TrimEnd(';') + ';' + $dir) }; \
                         [Environment]::SetEnvironmentVariable('Path', $newP, 'User'); \
                     } \
                 }",
            ])
            .status()
            .map_err(|e| format!("Failed to execute PowerShell PATH update: {}", e))?;

        if !status.success() {
            return Err("PowerShell failed to update Windows User PATH".to_string());
        }

        // Also append to current process PATH so immediate checks pass
        if let Some(curr_path) = std::env::var_os("PATH") {
            let mut paths = std::env::split_paths(&curr_path).collect::<Vec<_>>();
            if !paths.contains(&target_dir) {
                paths.push(target_dir.clone());
                if let Ok(new_var) = std::env::join_paths(paths) {
                    std::env::set_var("PATH", new_var);
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&destination) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&destination, perms);
        }

        // On Unix, attempt symlinking to /usr/local/bin if writable, else ~/.local/bin is already used
        let usr_local_bin = Path::new("/usr/local/bin");
        if usr_local_bin.exists() {
            let symlink_path = usr_local_bin.join("proxync");
            if symlink_path != destination {
                let _ = std::fs::remove_file(&symlink_path);
                let _ = std::os::unix::fs::symlink(&destination, &symlink_path);
            }
        }
    }

    cleanup_old_binaries(&target_dir);
    Ok("Proxync CLI installed and added to PATH successfully".to_string())
}

/// Uninstalls the Proxync CLI binary and removes it from the User PATH
pub fn uninstall_cli_from_path() -> Result<String, String> {
    let target_dir = get_default_cli_dir();
    let bin_name = if cfg!(target_os = "windows") { "proxync.exe" } else { "proxync" };
    let destination = target_dir.join(bin_name);

    if destination.exists() {
        let _ = std::fs::remove_file(&destination);
    }
    cleanup_old_binaries(&target_dir);

    #[cfg(target_os = "windows")]
    {
        // ponytail: pass dir via process-isolated env var to eliminate any CWE-78 command injection.
        let mut cmd = std::process::Command::new("powershell");
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd.env("PROXYNC_UNINSTALL_DIR", &target_dir);
        let _ = cmd.args(&[
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle", "Hidden",
            "-Command",
            "$dir = $env:PROXYNC_UNINSTALL_DIR; \
             if ($dir) { \
                 $cleanDir = $dir.TrimEnd('\\').ToLower(); \
                 $p = [Environment]::GetEnvironmentVariable('Path', 'User'); \
                 if ($p) { \
                     $parts = $p -split ';' | Where-Object { $_ -and $_.Trim().TrimEnd('\\').ToLower() -ne $cleanDir }; \
                     [Environment]::SetEnvironmentVariable('Path', ($parts -join ';'), 'User'); \
                 } \
             }",
        ]).status();

        // Also remove target_dir from current process in-memory PATH
        if let Some(curr_path) = std::env::var_os("PATH") {
            let paths: Vec<PathBuf> = std::env::split_paths(&curr_path)
                .filter(|p| !is_same_path(p, &target_dir) && p != &target_dir)
                .collect();
            if let Ok(new_var) = std::env::join_paths(paths) {
                std::env::set_var("PATH", new_var);
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::fs::remove_file("/usr/local/bin/proxync");
        let _ = std::fs::remove_file(target_dir.join("proxync"));
    }

    Ok("Proxync CLI uninstalled from PATH".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_cli_dir_not_empty() {
        let dir = get_default_cli_dir();
        assert!(!dir.as_os_str().is_empty());
    }

    #[test]
    fn test_check_cli_status_returns_valid_struct() {
        let status = check_cli_status();
        assert!(!status.install_dir.is_empty());
        if status.is_installed {
            assert!(status.binary_path.is_some());
        }
    }

    #[test]
    fn test_is_desktop_binary_filters_tauri_paths() {
        assert!(is_desktop_binary(Path::new(r"C:\repo\packages\desktop\src-tauri\target\release\proxync.exe"), None));
        assert!(is_desktop_binary(Path::new("/repo/packages/desktop/src-tauri/target/debug/proxync"), None));
        assert!(is_desktop_binary(Path::new(r"C:\bin\proxync-desktop.exe"), None));
        assert!(is_desktop_binary(Path::new("/usr/bin/proxync-desktop"), None));
        assert!(is_desktop_binary(Path::new("/usr/bin/proxync"), None));
        assert!(is_desktop_binary(Path::new("/bin/proxync"), None));
        assert!(is_desktop_binary(Path::new(r"C:\Program Files\Proxync\Proxync.exe"), None));
        assert!(is_desktop_binary(Path::new("C:/Program Files/Proxync/Proxync.exe"), None));
        assert!(is_desktop_binary(Path::new(r"C:\Users\User\AppData\Local\Programs\Proxync\Proxync.exe"), None));
        assert!(is_desktop_binary(Path::new("/Applications/Proxync.app/Contents/MacOS/Proxync"), None));
        assert!(!is_desktop_binary(Path::new(r"C:\Users\User\AppData\Local\Programs\Proxync\bin\proxync.exe"), None));
        assert!(!is_desktop_binary(Path::new("/Applications/Proxync.app/Contents/Resources/bin/proxync"), None));
        assert!(!is_desktop_binary(Path::new("/Users/user/.local/bin/proxync"), None));
        assert!(!is_desktop_binary(Path::new(r"C:\repo\packages\cli\target\release\proxync.exe"), None));
        assert!(!is_desktop_binary(Path::new("/repo/packages/cli/target/release/proxync"), None));
    }

    #[test]
    fn test_find_source_cli_binary_never_returns_gui() {
        if let Some(src) = find_source_cli_binary() {
            println!("Found CLI binary source: {:?}", src);
            assert!(!is_desktop_binary(&src, None));
            let s = src.to_string_lossy().to_lowercase();
            assert!(!s.contains("src-tauri"));
            assert!(s.contains("cli"));
        }
    }

    #[test]
    fn test_is_newer_version() {
        assert!(is_newer_version("v0.2.5", "0.2.4"));
        assert!(is_newer_version("0.3.0", "v0.2.4"));
        assert!(is_newer_version("1.0.0", "0.2.4"));
        assert!(!is_newer_version("0.2.4", "0.2.4"));
        assert!(!is_newer_version("v0.2.3", "0.2.4"));
    }

    #[test]
    fn test_compute_sha256() {
        assert_eq!(
            compute_sha256(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            compute_sha256(b"hello world"),
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn test_constant_time_eq_hex() {
        let hash_a = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
        let hash_b = "B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9";
        let hash_diff = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        assert!(constant_time_eq_hex(hash_a, hash_b));
        assert!(constant_time_eq_hex(hash_a, &format!("  {}  ", hash_b)));
        assert!(!constant_time_eq_hex(hash_a, hash_diff));
        assert!(!constant_time_eq_hex(hash_a, "short"));
    }

    #[test]
    fn test_verify_binary_magic() {
        // Rejects HTML / web error responses immediately (Stage 1)
        assert!(verify_binary_magic(b"<!DOCTYPE html><html><body>404 Not Found</body></html>", false).is_err());
        assert!(verify_binary_magic(b"<html><head><title>502 Bad Gateway</title></head></html>", false).is_err());
        assert!(verify_binary_magic(b"{\"message\": \"Not Found\", \"documentation_url\": \"...\"}", false).is_err());
        assert!(verify_binary_magic(b"404 Not Found", false).is_err());

        // Gzip archive checks
        assert!(verify_binary_magic(&[0x1f, 0x8b, 0x08, 0x00], true).is_ok());
        assert!(verify_binary_magic(&[0x00, 0x00], true).is_err());

        // Abnormally small binary
        assert!(verify_binary_magic(&[0x4d, 0x5a, 0x00], false).is_err());

        #[cfg(target_os = "windows")]
        {
            let mut fake_exe = vec![0u8; 65 * 1024];
            fake_exe[0] = 0x4d;
            fake_exe[1] = 0x5a;
            assert!(verify_binary_magic(&fake_exe, false).is_ok());

            fake_exe[0] = 0x00;
            assert!(verify_binary_magic(&fake_exe, false).is_err());
        }

        #[cfg(target_os = "linux")]
        {
            let mut fake_elf = vec![0u8; 65 * 1024];
            fake_elf[0] = 0x7f;
            fake_elf[1] = b'E';
            fake_elf[2] = b'L';
            fake_elf[3] = b'F';
            assert!(verify_binary_magic(&fake_elf, false).is_ok());

            fake_elf[0] = 0x00;
            assert!(verify_binary_magic(&fake_elf, false).is_err());
        }

        #[cfg(target_os = "macos")]
        {
            let mut fake_macho = vec![0u8; 65 * 1024];
            fake_macho[0] = 0xcf;
            fake_macho[1] = 0xfa;
            fake_macho[2] = 0xed;
            fake_macho[3] = 0xfe;
            assert!(verify_binary_magic(&fake_macho, false).is_ok());

            fake_macho[0] = 0x00;
            assert!(verify_binary_magic(&fake_macho, false).is_err());
        }
    }

    #[test]
    fn test_verify_minisign_signature_behavior() {
        // Test with real release signature format
        let sig_text = "untrusted comment: signature from tauri secret key\n\
RURs5omD9gZF+I6higglcbuJmGs9fptwWduZ7OSvBVJw06r/IMGNqDlRK+Fi2EEUndE6nh5pTO+2T2eo5KGZXIWh8jCZRGJIAs=\n\
trusted comment: timestamp:1790330898\tfile:Proxync_0.2.3_x64_en-US.msi\tversion:0.2.3\n\
JZXsf2cKCVro/URvperLwTxJr+BvGM0f1dGshebhDh6tb70Vl6fVabDQyz1wHntewMnXtDIxlpglV7u88LgsCA==\n";

        // Random payload must fail verification with this signature
        let tampered_payload = b"malicious binary payload injected into updater";
        let result = verify_minisign_signature(tampered_payload, sig_text);
        assert!(result.is_err(), "Signature verification must fail on mismatched payload");

        // Malformed signature string must fail
        assert!(verify_minisign_signature(b"test", "not a valid signature").is_err());
    }

    #[test]
    fn test_downgrade_prevention() {
        // Newer versions pass
        assert!(is_newer_version("v0.2.5", "0.2.4"));
        assert!(is_newer_version("0.3.0", "v0.2.4"));
        assert!(is_newer_version("1.0.0", "0.2.4"));

        // Same or older versions fail
        assert!(!is_newer_version("0.2.4", "0.2.4"));
        assert!(!is_newer_version("v0.2.4", "0.2.4"));
        assert!(!is_newer_version("0.2.3", "0.2.4"));
        assert!(!is_newer_version("v0.1.9", "0.2.4"));
    }
}
