fn get_base_data_dir() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    let mut dir = if let Ok(appdata) = std::env::var("APPDATA") {
        std::path::PathBuf::from(appdata)
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        std::path::PathBuf::from(userprofile).join("AppData").join("Roaming")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(target_os = "macos")]
    let mut dir = if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join("Library").join("Application Support")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(target_os = "linux")]
    let mut dir = if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        std::path::PathBuf::from(xdg)
    } else if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let mut dir = if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config")
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    dir.push("Proxync");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn get_data_filepath() -> std::path::PathBuf {
    let mut dir = get_base_data_dir();
    dir.push("data.json");
    dir
}

fn get_logs_dir() -> std::path::PathBuf {
    let mut dir = get_base_data_dir();
    dir.push("logs");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct LogsSummary {
    pub logs_dir: String,
    pub app_log_bytes: u64,
    pub traffic_log_bytes: u64,
    pub app_log_lines: usize,
    pub traffic_log_lines: usize,
}

#[tauri::command]
pub async fn append_log_entry(category: String, line: String) -> Result<(), String> {
    use std::io::Write;
    let logs_dir = get_logs_dir();
    let filename = match category.as_str() {
        "traffic" => "traffic.log",
        _ => "app.log",
    };
    let file_path = logs_dir.join(filename);
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    
    writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clear_log_files() -> Result<(), String> {
    let logs_dir = get_logs_dir();
    let app_log = logs_dir.join("app.log");
    let traffic_log = logs_dir.join("traffic.log");
    let _ = std::fs::write(&app_log, "");
    let _ = std::fs::write(&traffic_log, "");
    Ok(())
}

#[tauri::command]
pub async fn open_logs_folder() -> Result<(), String> {
    let logs_dir = get_logs_dir();
    let path_str = logs_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn read_logs_summary() -> Result<LogsSummary, String> {
    let logs_dir = get_logs_dir();
    let app_log_path = logs_dir.join("app.log");
    let traffic_log_path = logs_dir.join("traffic.log");

    let app_bytes = std::fs::metadata(&app_log_path).map(|m| m.len()).unwrap_or(0);
    let traffic_bytes = std::fs::metadata(&traffic_log_path).map(|m| m.len()).unwrap_or(0);

    let app_lines = if app_bytes > 0 {
        std::fs::read_to_string(&app_log_path).map(|s| s.lines().count()).unwrap_or(0)
    } else {
        0
    };

    let traffic_lines = if traffic_bytes > 0 {
        std::fs::read_to_string(&traffic_log_path).map(|s| s.lines().count()).unwrap_or(0)
    } else {
        0
    };

    Ok(LogsSummary {
        logs_dir: logs_dir.to_string_lossy().to_string(),
        app_log_bytes: app_bytes,
        traffic_log_bytes: traffic_bytes,
        app_log_lines: app_lines,
        traffic_log_lines: traffic_lines,
    })
}

#[tauri::command]
pub async fn save_app_state(state: String) -> Result<(), String> {
    let filepath = get_data_filepath();
    std::fs::write(&filepath, state).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_app_state() -> Result<String, String> {
    let filepath = get_data_filepath();
    if !filepath.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&filepath).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let local_addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(local_addr.ip().to_string())
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err("Provided path is not a directory".to_string());
    }

    fn visit_dirs(dir: &std::path::Path, files: &mut Vec<String>, root_len: usize) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in std::fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if name == "node_modules" || name == "target" || name == ".git" || name == "build" || name == "bin" || name == ".gradle" {
                        continue;
                    }
                    visit_dirs(&path, files, root_len)?;
                } else {
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        let ext = ext.to_lowercase();
                        if ext == "java" || ext == "ts" || ext == "js" || ext == "py" || ext == "go" || ext == "cs" || ext == "controller" {
                            let rel_path = path.to_str().unwrap_or("")[root_len..].to_string();
                            files.push(rel_path);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    visit_dirs(root, &mut files, root.to_str().unwrap_or("").len()).map_err(|e| e.to_string())?;
    Ok(files)
}

#[tauri::command]
pub async fn read_file_content(root_path: String, rel_path: String) -> Result<String, String> {
    let root = std::path::Path::new(&root_path);
    let canonical_root = std::fs::canonicalize(root)
        .map_err(|e| format!("Invalid root directory: {}", e))?;
    
    let clean_rel = rel_path.trim_start_matches('/').trim_start_matches('\\');
    let target = root.join(clean_rel);
    
    let canonical_target = std::fs::canonicalize(&target)
        .map_err(|e| format!("File does not exist: {}", e))?;
    
    // CSO Path Traversal Guard: verify the target does not escape the canonical root directory
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Access denied: Path traversal detected".to_string());
    }
    
    std::fs::read_to_string(canonical_target).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_file_in_editor(file_path: String, line_number: Option<u32>, editor: Option<String>) -> Result<(), String> {
    let ed = editor.unwrap_or_else(|| "vscode".to_string()).to_lowercase();
    let line = line_number.unwrap_or(1);
    let binary_name = if ed == "cursor" { "cursor" } else { "code" };
    let scheme = if ed == "cursor" { "cursor" } else { "vscode" };

    // --- TIER 1: Direct CLI with Exact Line Jump (-g <path>:<line>) ---
    #[cfg(target_os = "windows")]
    {
        let normalized_path = file_path.replace('/', "\\");
        let goto_arg = format!("{}:{}", normalized_path, line);

        // 1a. Try <binary>.cmd (standard Windows CLI batch wrapper)
        let cmd_name = format!("{}.cmd", binary_name);
        if let Ok(mut child) = std::process::Command::new(&cmd_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Try raw binary in PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 2: OS URI Protocol Handler (vscode://file/... or cursor://file/...) ---
        let norm_uri_path = file_path.replace('\\', "/");
        let uri = format!("{}://file/{}:{}", scheme, norm_uri_path, line);
        if let Ok(mut child) = std::process::Command::new("cmd").args(&["/c", "start", "", &uri]).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: OS Default Associated Application Fallback ---
        let _ = std::process::Command::new("cmd").args(&["/c", "start", "", &normalized_path]).spawn();
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let goto_arg = format!("{}:{}", file_path, line);

        // 1a. Try CLI binary in standard PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Check common macOS paths (/usr/local/bin, /opt/homebrew/bin, Application bundle bin)
        let mac_candidates = [
            format!("/usr/local/bin/{}", binary_name),
            format!("/opt/homebrew/bin/{}", binary_name),
            if ed == "cursor" {
                "/Applications/Cursor.app/Contents/Resources/app/bin/cursor".to_string()
            } else {
                "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code".to_string()
            },
        ];
        for candidate in &mac_candidates {
            if std::path::Path::new(candidate).exists() {
                if let Ok(mut child) = std::process::Command::new(candidate).arg("-g").arg(&goto_arg).spawn() {
                    if child.wait().map(|s| s.success()).unwrap_or(false) {
                        return Ok(());
                    }
                }
            }
        }

        // --- TIER 2: macOS URL Scheme (`open vscode://file/...`) ---
        let uri = format!("{}://file/{}:{}", scheme, file_path, line);
        if let Ok(mut child) = std::process::Command::new("open").arg(&uri).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: macOS Default App Fallback (`open <file_path>`) ---
        let _ = std::process::Command::new("open").arg(&file_path).spawn();
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let goto_arg = format!("{}:{}", file_path, line);

        // 1a. Try CLI binary in PATH
        if let Ok(mut child) = std::process::Command::new(binary_name).arg("-g").arg(&goto_arg).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // 1b. Check common Linux paths (/usr/bin, /usr/local/bin, /snap/bin)
        let linux_candidates = [
            format!("/usr/bin/{}", binary_name),
            format!("/usr/local/bin/{}", binary_name),
            format!("/snap/bin/{}", binary_name),
        ];
        for candidate in &linux_candidates {
            if std::path::Path::new(candidate).exists() {
                if let Ok(mut child) = std::process::Command::new(candidate).arg("-g").arg(&goto_arg).spawn() {
                    if child.wait().map(|s| s.success()).unwrap_or(false) {
                        return Ok(());
                    }
                }
            }
        }

        // --- TIER 2: Linux XDG URL Scheme (`xdg-open vscode://file/...`) ---
        let uri = format!("{}://file/{}:{}", scheme, file_path, line);
        if let Ok(mut child) = std::process::Command::new("xdg-open").arg(&uri).spawn() {
            if child.wait().map(|s| s.success()).unwrap_or(false) {
                return Ok(());
            }
        }

        // --- TIER 3: Linux XDG Default App Fallback (`xdg-open <file_path>`) ---
        let _ = std::process::Command::new("xdg-open").arg(&file_path).spawn();
        return Ok(());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(())
    }
}

#[tauri::command]
pub async fn save_support_bundle_dialog(json_content: String) -> Result<Option<String>, String> {
    let default_name = format!(
        "proxync-support-bundle-{}.json",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    );

    #[cfg(target_os = "windows")]
    {
        let script = format!(
            "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.SaveFileDialog; $f.Title = 'Save Proxync Support Diagnostic Bundle'; $f.Filter = 'JSON Files (*.json)|*.json|All Files (*.*)|*.*'; $f.FileName = '{}'; if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){{ $f.FileName }}",
            default_name
        );
        let output = std::process::Command::new("powershell")
            .args(&["-NoProfile", "-NonInteractive", "-Command", &script])
            .output();

        if let Ok(out) = output {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                std::fs::write(&path_str, json_content).map_err(|e| e.to_string())?;
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "POSIX path of (choose file name with prompt \"Save Proxync Support Diagnostic Bundle:\" default name \"{}\")",
            default_name
        );
        let output = std::process::Command::new("osascript")
            .args(&["-e", &script])
            .output();

        if let Ok(out) = output {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                std::fs::write(&path_str, json_content).map_err(|e| e.to_string())?;
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("zenity")
            .args(&["--file-selection", "--save", "--confirm-overwrite", "--title=Save Proxync Support Diagnostic Bundle", &format!("--filename={}", default_name)])
            .output();

        if let Ok(out) = output {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                std::fs::write(&path_str, json_content).map_err(|e| e.to_string())?;
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    Ok(None)
}


