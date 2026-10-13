use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

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

/// Downloads a binary from `download_url` and atomically replaces `destination` with safe rollback & cleanup
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

    if bytes.len() < 1024 {
        return Err("Downloaded binary file is corrupt or too small.".to_string());
    }

    let temp_path = destination.with_extension(format!("tmp-{}", std::process::id()));

    #[cfg(target_os = "windows")]
    {
        std::fs::write(&temp_path, &bytes)
            .map_err(|e| format!("Failed to write temporary binary {}: {}", temp_path.display(), e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let is_tar_gz = download_url.ends_with(".tar.gz")
            || (bytes.len() >= 2 && bytes[0] == 0x1f && bytes[1] == 0x8b);

        if is_tar_gz {
            let temp_archive = destination.with_extension(format!("archive-{}.tar.gz", std::process::id()));
            std::fs::write(&temp_archive, &bytes)
                .map_err(|e| format!("Failed to write temporary archive {}: {}", temp_archive.display(), e))?;

            let extract_dir = destination.with_extension(format!("extract-{}", std::process::id()));
            let _ = std::fs::create_dir_all(&extract_dir);

            let status = std::process::Command::new("tar")
                .args(&["-xzf", &temp_archive.to_string_lossy(), "-C", &extract_dir.to_string_lossy()])
                .status()
                .map_err(|e| format!("Failed to run tar extraction: {}", e))?;

            let _ = std::fs::remove_file(&temp_archive);

            if !status.success() {
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("Failed to extract CLI archive with tar".to_string());
            }

            let extracted_bin = extract_dir.join("proxync");
            if !extracted_bin.is_file() {
                let _ = std::fs::remove_dir_all(&extract_dir);
                return Err("CLI binary 'proxync' not found in downloaded archive".to_string());
            }

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

    // Replace existing binary
    if destination.exists() {
        #[cfg(target_os = "windows")]
        {
            let old_path = destination.with_extension(format!("old-{}", std::process::id()));
            let _ = std::fs::remove_file(&old_path);
            std::fs::rename(destination, &old_path)
                .map_err(|e| format!("Failed to rotate running binary on Windows: {}", e))?;
            std::fs::rename(&temp_path, destination)
                .map_err(|e| format!("Failed to move new binary into place: {}", e))?;

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
            std::fs::rename(&temp_path, destination)
                .map_err(|e| format!("Failed to atomically replace binary: {}", e))?;
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
}
