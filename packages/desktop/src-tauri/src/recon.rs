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

fn resolve_directory(exec_path: &Option<String>, cmd_line: &Option<String>) -> String {
    if let Some(cmd) = cmd_line {
        let mut best_dir = None;
        for word in cmd.split_whitespace() {
            let clean_word = word.trim_matches('"').trim_matches('\'');
            if is_absolute_win_path(clean_word) {
                let path = std::path::Path::new(clean_word);
                if path.exists() {
                    let dir = if path.is_dir() {
                        Some(path.to_path_buf())
                    } else {
                        path.parent().map(|p| p.to_path_buf())
                    };
                    
                    if let Some(d) = dir {
                        let dir_str = d.to_string_lossy().to_string();
                        if !dir_str.contains("nodejs") && !dir_str.contains("npm") && !dir_str.contains("AppData") {
                            if let Some(node_modules_idx) = dir_str.find("\\node_modules") {
                                best_dir = Some(dir_str[..node_modules_idx].to_string());
                            } else {
                                best_dir = Some(dir_str);
                            }
                            break;
                        }
                    }
                }
            }
        }
        if let Some(bd) = best_dir {
            return bd;
        }
    }
    
    if let Some(exec) = exec_path {
        if let Some(parent) = std::path::Path::new(exec).parent() {
            return parent.to_string_lossy().to_string();
        }
    }
    
    "unknown".to_string()
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
                candidate.directory = Some(resolve_directory(&exec_path, &cmd_line));
            }
        }

        cache.insert(port, candidate.clone());
        candidates.push(candidate);
    }
    
    Ok(candidates)
}
