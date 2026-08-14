use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Clone)]
pub struct ProcessCandidate {
    pub id: String,
    pub name: String,
    pub port: u16,
    pub pid: Option<u32>,
    pub command: Option<String>,
    pub directory: Option<String>,
    pub executable: Option<String>,
    pub framework: Option<String>,
    pub access: String,
    pub uptime: Option<String>,
}

lazy_static! {
    static ref RECON_PROCESS_CACHE: Arc<Mutex<HashMap<u16, ProcessCandidate>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn scan_ports() -> Result<Vec<u16>, String> {
    let common_ports = vec![3000u16, 3001, 4000, 4200, 5000, 5173, 8000, 8080, 8888];

    // Probe all ports concurrently — worst case is one timeout (~150ms) not N timeouts
    let probes: Vec<_> = common_ports.iter().map(|&port| async move {
        let addr = format!("127.0.0.1:{}", port);
        let alive = tokio::time::timeout(
            std::time::Duration::from_millis(150),
            tokio::net::TcpStream::connect(&addr),
        ).await.is_ok();
        (port, alive)
    }).collect();

    let results = futures_util::future::join_all(probes).await;
    let active = results.into_iter().filter_map(|(port, alive)| if alive { Some(port) } else { None }).collect();
    Ok(active)
}

fn get_pid_for_port(port: u16) -> Option<u32> {
    let mut cmd = std::process::Command::new("netstat");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args(&["-ano"])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    for line in stdout.lines() {
        if line.contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 {
                let local_addr = parts[1];
                if local_addr.ends_with(&format!(":{}", port)) {
                    if let Some(pid_str) = parts.last() {
                        if let Ok(pid) = pid_str.parse::<u32>() {
                            return Some(pid);
                        }
                    }
                }
            }
        }
    }
    None
}

fn get_process_info(pid: u32) -> Option<(Option<String>, Option<String>, Option<String>)> {
    let ps_cmd = format!(
        "Get-CimInstance Win32_Process -Filter 'ProcessId = {}' | Select-Object -Property Name, ExecutablePath, CommandLine | ConvertTo-Json",
        pid
    );
    let mut cmd = std::process::Command::new("powershell");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    let output = cmd
        .args(&["-Command", &ps_cmd])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    let val: serde_json::Value = serde_json::from_str(&stdout).ok()?;
    
    let name = val.get("Name").and_then(|v| v.as_str()).map(|s| s.to_string());
    let exec_path = val.get("ExecutablePath").and_then(|v| v.as_str()).map(|s| s.to_string());
    let cmd_line = val.get("CommandLine").and_then(|v| v.as_str()).map(|s| s.to_string());
    
    Some((name, exec_path, cmd_line))
}

fn is_absolute_win_path(s: &str) -> bool {
    let mut chars = s.chars();
    let first = chars.next();
    let second = chars.next();
    let third = chars.next();
    
    first.map(|c| c.is_ascii_alphabetic()).unwrap_or(false)
        && second == Some(':')
        && third == Some('\\')
}

fn is_system_installation_dir(path_str: &str) -> bool {
    let lower = path_str.to_lowercase();
    lower.contains("\\nvm")
        || lower.contains("\\nodejs")
        || lower.contains("\\appdata")
        || lower.contains("\\program files")
        || lower.contains("\\windows")
        || lower.contains("\\system32")
}

fn extract_root_from_path(start_path: &str) -> Option<String> {
    if start_path.trim().is_empty() {
        return None;
    }

    let clean = start_path.trim_matches('"').trim_matches('\'');
    let mut path = std::path::PathBuf::from(clean);

    if path.is_file() {
        if let Some(parent) = path.parent() {
            path = parent.to_path_buf();
        }
    }

    let path_str = path.to_string_lossy().to_string();
    if is_system_installation_dir(&path_str) {
        return None;
    }

    if let Some(idx) = path_str.find("\\node_modules") {
        let parent = &path_str[..idx];
        if !parent.is_empty() && !is_system_installation_dir(parent) && std::path::Path::new(parent).exists() {
            return Some(parent.to_string());
        }
    }

    if path.exists() && path.is_dir() {
        return Some(path_str);
    }

    None
}

fn resolve_directory_advanced(exec_path: &Option<String>, cmd_line: &Option<String>, pid: Option<u32>) -> String {
    // Stage 1: Inspect Command Line arguments for direct absolute or relative paths
    if let Some(cmd) = cmd_line {
        for word in cmd.split_whitespace() {
            let clean = word.trim_matches('"').trim_matches('\'');
            if is_absolute_win_path(clean) || clean.contains('/') || clean.contains('\\') {
                if let Some(root) = extract_root_from_path(clean) {
                    return root;
                }
            }
        }
    }

    // Stage 2: Walk Parent Process Tree up to 5 levels (WMI ParentProcessId chain)
    if let Some(p) = pid {
        let ps_cmd = format!(
            "$curr = {}; for ($i=0; $i -lt 5; $i++) {{ $proc = Get-CimInstance Win32_Process -Filter \"ProcessId = $curr\"; if (-not $proc -or -not $proc.ParentProcessId) {{ break }}; $parent = Get-CimInstance Win32_Process -Filter \"ProcessId = $($proc.ParentProcessId)\"; if ($parent -and $parent.CommandLine) {{ Write-Output $parent.CommandLine }}; $curr = $proc.ParentProcessId }}",
            p
        );
        let mut cmd = std::process::Command::new("powershell");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);
        if let Ok(output) = cmd.args(&["-Command", &ps_cmd]).output() {
            let parent_output = String::from_utf8_lossy(&output.stdout);
            for line in parent_output.lines() {
                let trimmed_line = line.trim();
                if !trimmed_line.is_empty() {
                    for word in trimmed_line.split_whitespace() {
                        let clean = word.trim_matches('"').trim_matches('\'');
                        if is_absolute_win_path(clean) || clean.contains('/') || clean.contains('\\') {
                            if let Some(root) = extract_root_from_path(clean) {
                                return root;
                            }
                        }
                    }
                }
            }
        }
    }

    // Stage 3: Inspect Executable Path
    if let Some(exec) = exec_path {
        if let Some(root) = extract_root_from_path(exec) {
            return root;
        }
    }

    // Stage 4: Dynamic Script Search Fallback (Current Working Directory & User Home)
    if let Some(cmd) = cmd_line {
        if cmd.contains("server.js") || cmd.contains("app.js") || cmd.contains("index.js") || cmd.contains("main.js") {
            let script_name = if cmd.contains("server.js") {
                "server.js"
            } else if cmd.contains("app.js") {
                "app.js"
            } else if cmd.contains("main.js") {
                "main.js"
            } else {
                "index.js"
            };

            let mut dynamic_roots = Vec::new();
            if let Ok(cwd) = std::env::current_dir() {
                dynamic_roots.push(cwd);
            }
            if let Ok(user_profile) = std::env::var("USERPROFILE") {
                dynamic_roots.push(std::path::PathBuf::from(user_profile));
            } else if let Ok(home) = std::env::var("HOME") {
                dynamic_roots.push(std::path::PathBuf::from(home));
            }

            for root_candidate in dynamic_roots {
                let path_check = root_candidate.join(script_name);
                if path_check.exists() {
                    return root_candidate.to_string_lossy().to_string();
                }
            }
        }
    }

    "unknown".to_string()
}

#[tauri::command]
pub async fn resolve_process_directory(port: u16, pid: Option<u32>) -> Result<String, String> {
    let target_pid = pid.or_else(|| get_pid_for_port(port));
    if let Some(pid_val) = target_pid {
        if let Some((_, exec_path, cmd_line)) = get_process_info(pid_val) {
            let resolved = resolve_directory_advanced(&exec_path, &cmd_line, Some(pid_val));
            if resolved != "unknown" {
                return Ok(resolved);
            }
        }
    }
    Err("Unable to resolve project directory for process".to_string())
}

#[tauri::command]
pub async fn scan_processes(bypass_cache: bool) -> Result<Vec<ProcessCandidate>, String> {
    let ports = scan_ports().await?;
    let mut candidates = Vec::new();
    
    let mut cache = RECON_PROCESS_CACHE.lock().await;
    cache.retain(|port, _| ports.contains(port));
    
    for port in ports {
        if !bypass_cache {
            if let Some(cached) = cache.get(&port) {
                candidates.push(cached.clone());
                continue;
            }
        }
        
        let framework = match port {
            3000 | 3001 => "Node app",
            4000 => "GraphQL service",
            4200 => "Angular app",
            5000 => "Flask or .NET app",
            5173 => "Vite server",
            8000 => "Django or FastAPI app",
            8080 => "HTTP service",
            8888 => "Notebook server",
            _ => "Development server",
        };

        let mut candidate = ProcessCandidate {
            id: format!("port-{}", port),
            name: framework.to_string(),
            port,
            pid: None,
            command: Some(format!("localhost:{}", port)),
            directory: Some("unknown".to_string()),
            executable: Some("unknown".to_string()),
            framework: Some(framework.to_string()),
            access: "ready".to_string(),
            uptime: Some("live".to_string()),
        };

        if let Some(pid) = get_pid_for_port(port) {
            candidate.pid = Some(pid);
            if let Some((name, exec_path, cmd_line)) = get_process_info(pid) {
                if let Some(n) = name {
                    candidate.name = n;
                }
                if let Some(ref exec) = exec_path {
                    candidate.executable = Some(exec.clone());
                }
                candidate.directory = Some(resolve_directory_advanced(&exec_path, &cmd_line, Some(pid)));
            }
        }

        cache.insert(port, candidate.clone());
        candidates.push(candidate);
    }
    
    Ok(candidates)
}
