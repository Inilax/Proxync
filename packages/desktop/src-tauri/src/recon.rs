use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Clone, Debug)]
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

#[allow(dead_code)]
#[derive(Clone, Debug)]
struct RawProcess {
    pid: u32,
    parent_pid: Option<u32>,
    name: String,
    exec_path: Option<String>,
    cmd_line: Option<String>,
}

#[allow(dead_code)]
enum ProcessType {
    Dev {
        runtime: String,
        framework: Option<String>,
    },
    Infra {
        name: String,
    },
    SystemOrUnknown,
}

lazy_static! {
    static ref RECON_PROCESS_CACHE: Arc<Mutex<HashMap<u16, ProcessCandidate>>> = Arc::new(Mutex::new(HashMap::new()));
}

/* ══════════════════════════════════════════════
   PORT DISCOVERY & DEV FILTERING (via netstat)
   ══════════════════════════════════════════════ */

fn is_dev_port(port: u16) -> bool {
    // Exclude well-known Windows system, RPC, and common non-dev ports
    match port {
        135 | 136 | 137 | 138 | 139 | 445 | 2869 | 5040 | 6463 | 5357 | 49152..=49157 => false,
        80 | 443 | 1024..=49151 => true,
        _ => false,
    }
}

fn get_listening_ports_map() -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
    let mut port_to_pid = HashMap::new();
    let mut pid_to_ports = HashMap::new();

    let mut cmd = std::process::Command::new("netstat");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    // Note: Use `netstat -ano` without `-p tcp` because `-p tcp` restricts Windows netstat to IPv4 only,
    // which misses services listening on IPv6 localhost (e.g. `[::1]:5173` or `[::]:5173` for Vite/Node).
    if let Ok(output) = cmd.args(&["-ano"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains("LISTENING") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 {
                    let proto = parts[0];
                    if !proto.eq_ignore_ascii_case("TCP") {
                        continue;
                    }
                    let local_addr = parts[1];
                    if let Some(port_str) = local_addr.split(':').last() {
                        let clean_port = port_str.trim_matches(|c: char| !c.is_ascii_digit());
                        if let (Ok(port), Ok(pid)) = (clean_port.parse::<u16>(), parts[parts.len() - 1].parse::<u32>()) {
                            if is_dev_port(port) {
                                port_to_pid.insert(port, pid);
                                pid_to_ports.entry(pid).or_insert_with(Vec::new).push(port);
                            }
                        }
                    }
                }
            }
        }
    }

    (port_to_pid, pid_to_ports)
}

#[tauri::command]
pub async fn scan_ports() -> Result<Vec<u16>, String> {
    let (port_to_pid, _) = get_listening_ports_map();
    let mut ports: Vec<u16> = port_to_pid.into_keys().collect();
    ports.sort_unstable();
    Ok(ports)
}

/* ══════════════════════════════════════════════
   BULK PROCESS RECON (Single WMI Query)
   ══════════════════════════════════════════════ */

fn get_all_processes_map() -> HashMap<u32, RawProcess> {
    let mut map = HashMap::new();
    let ps_cmd = "$procs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine; $procs | ConvertTo-Json -Depth 2";

    let mut cmd = std::process::Command::new("powershell");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    if let Ok(output) = cmd.args(&["-NoProfile", "-OutputFormat", "Text", "-Command", ps_cmd]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let json_str = if let Some(idx) = stdout.find('[') {
            &stdout[idx..]
        } else if let Some(idx) = stdout.find('{') {
            &stdout[idx..]
        } else {
            &stdout
        };

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str) {
            let list = match val {
                serde_json::Value::Array(arr) => arr,
                serde_json::Value::Object(_) => vec![val],
                _ => vec![],
            };

            for item in list {
                if let Some(pid) = item.get("ProcessId").and_then(|v| v.as_u64()).map(|v| v as u32) {
                    let parent_pid = item.get("ParentProcessId").and_then(|v| v.as_u64()).map(|v| v as u32);
                    let name = item.get("Name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let exec_path = item.get("ExecutablePath").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let cmd_line = item.get("CommandLine").and_then(|v| v.as_str()).map(|s| s.to_string());

                    map.insert(pid, RawProcess {
                        pid,
                        parent_pid,
                        name,
                        exec_path,
                        cmd_line,
                    });
                }
            }
        }
    }

    map
}

/* ══════════════════════════════════════════════
   PROCESS CLASSIFICATION & FRAMEWORK FINGERPRINTING
   ══════════════════════════════════════════════ */

fn is_system_process_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.starts_with("svchost")
        || lower.starts_with("lsass")
        || lower.starts_with("csrss")
        || lower.starts_with("wininit")
        || lower.starts_with("services")
        || lower.starts_with("smss")
        || lower == "system"
        || lower == "idle"
        || lower.starts_with("taskhostw")
        || lower.starts_with("spoolsv")
        || lower.starts_with("msmpeng")
        || lower.starts_with("searchindexer")
        || lower.starts_with("onedrive")
        || lower.starts_with("teams")
        || lower.starts_with("slack")
        || lower.starts_with("discord")
        || lower.starts_with("spotify")
        || lower.starts_with("zoom")
        || lower.starts_with("chrome")
        || lower.starts_with("msedge")
        || lower.starts_with("firefox")
        || lower.starts_with("brave")
        || lower.starts_with("explorer")
        || lower.starts_with("shellexperiencehost")
        || lower.starts_with("runtimebroker")
        || lower.starts_with("applicationframehost")
        || lower.starts_with("startmenuexperiencehost")
        || lower.starts_with("textinputhost")
        || lower.starts_with("wmiprvse")
        || lower.starts_with("code")
        || lower.starts_with("cursor")
        || lower.starts_with("antigravity")
        || lower.starts_with("language_server")
        || lower.starts_with("copilot")
        || lower.starts_with("conhost")
        || lower.starts_with("dllhost")
        || lower.starts_with("ctfmon")
}

fn is_infra_process_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.starts_with("docker")
        || lower.starts_with("com.docker")
        || lower.starts_with("postgres")
        || lower.starts_with("mysql")
        || lower.starts_with("mongod")
        || lower.starts_with("redis")
        || lower.starts_with("nginx")
        || lower.starts_with("apache")
        || lower.starts_with("httpd")
        || lower.starts_with("vault")
        || lower.starts_with("consul")
        || lower.starts_with("etcd")
        || lower.starts_with("kafka")
        || lower.starts_with("rabbitmq")
}

fn detect_framework(cmd_line: &str) -> Option<String> {
    let lower = cmd_line.to_lowercase();
    if lower.contains("vite") {
        Some("Vite Dev Server".to_string())
    } else if lower.contains("next\\dist\\server") || lower.contains("next/dist/server") || lower.contains("next dev") || lower.contains("next start") {
        Some("Next.js App".to_string())
    } else if lower.contains("@nestjs\\cli") || lower.contains("@nestjs/cli") || lower.contains("nest start") || (lower.contains("dist\\src") && lower.contains("node")) {
        Some("NestJS App".to_string())
    } else if lower.contains("nuxt") {
        Some("Nuxt.js App".to_string())
    } else if lower.contains("remix") {
        Some("Remix App".to_string())
    } else if lower.contains("astro") {
        Some("Astro App".to_string())
    } else if lower.contains("webpack") {
        Some("Webpack Dev Server".to_string())
    } else if lower.contains("react-scripts") {
        Some("Create React App".to_string())
    } else if lower.contains("fastapi") || lower.contains("uvicorn") {
        Some("FastAPI App".to_string())
    } else if lower.contains("django") {
        Some("Django App".to_string())
    } else if lower.contains("flask") {
        Some("Flask App".to_string())
    } else if lower.contains("spring-boot") || lower.contains("springframework") {
        Some("Spring Boot App".to_string())
    } else if lower.contains("express") || lower.contains("server.js") || lower.contains("app.js") || lower.contains("index.js") {
        Some("Node.js / Express".to_string())
    } else {
        None
    }
}

fn classify_process(name: &str, cmd_line: Option<&str>) -> ProcessType {
    if is_system_process_name(name) {
        return ProcessType::SystemOrUnknown;
    }
    if is_infra_process_name(name) {
        return ProcessType::Infra { name: name.to_string() };
    }

    let lower_name = name.to_lowercase();
    let runtime = if lower_name.starts_with("node") {
        "Node.js"
    } else if lower_name.starts_with("python") || lower_name.starts_with("uvicorn") || lower_name.starts_with("gunicorn") {
        "Python"
    } else if lower_name.starts_with("deno") {
        "Deno"
    } else if lower_name.starts_with("bun") {
        "Bun"
    } else if lower_name.starts_with("java") {
        "Java"
    } else if lower_name.starts_with("go") || lower_name == "main.exe" {
        "Go"
    } else if lower_name.starts_with("cargo") {
        "Rust/Cargo"
    } else if lower_name.starts_with("ruby") || lower_name.starts_with("puma") || lower_name.starts_with("rails") {
        "Ruby"
    } else if lower_name.starts_with("php") {
        "PHP"
    } else if lower_name.starts_with("dotnet") {
        ".NET"
    } else if lower_name.starts_with("proxync") {
        "Proxync"
    } else if let Some(cmd) = cmd_line {
        if let Some(fw) = detect_framework(cmd) {
            return ProcessType::Dev {
                runtime: name.to_string(),
                framework: Some(fw),
            };
        }
        return ProcessType::SystemOrUnknown;
    } else {
        return ProcessType::SystemOrUnknown;
    };

    let framework = cmd_line.and_then(detect_framework);
    ProcessType::Dev {
        runtime: runtime.to_string(),
        framework,
    }
}

/* ══════════════════════════════════════════════
   PROJECT DIRECTORY EXTRACTION & RESOLUTION
   ══════════════════════════════════════════════ */

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
        || lower.contains("\\site-packages")
        || lower.contains("\\dist-packages")
}

const PROJECT_ROOT_INDICATORS: &[&str] = &[
    "package.json", "Cargo.toml", "go.mod", "requirements.txt",
    "pyproject.toml", "setup.py", "pom.xml", "build.gradle",
    "tsconfig.json", "vite.config.ts", "vite.config.js",
    "next.config.js", "next.config.mjs", "nuxt.config.ts",
    ".env", ".git",
];

fn is_project_root(dir: &std::path::Path) -> bool {
    if !dir.exists() || !dir.is_dir() {
        return false;
    }
    let dir_str = dir.to_string_lossy();
    if is_system_installation_dir(&dir_str) {
        return false;
    }
    for ind in PROJECT_ROOT_INDICATORS {
        if dir.join(ind).exists() {
            return true;
        }
    }
    false
}

fn walk_up_to_project_root(start: &std::path::Path) -> Option<String> {
    let mut curr = start.to_path_buf();
    if curr.is_file() {
        if let Some(parent) = curr.parent() {
            curr = parent.to_path_buf();
        }
    }

    while curr.as_os_str().len() > 0 {
        if curr.file_name().map(|n| n.to_string_lossy().to_lowercase()) == Some("node_modules".to_string()) {
            if let Some(parent) = curr.parent() {
                curr = parent.to_path_buf();
                continue;
            }
        }
        if is_project_root(&curr) {
            return Some(curr.to_string_lossy().to_string());
        }
        if let Some(parent) = curr.parent() {
            if parent == curr {
                break;
            }
            curr = parent.to_path_buf();
        } else {
            break;
        }
    }
    None
}

fn extract_candidate_paths_from_cmd(cmd_line: &str) -> Vec<String> {
    let mut paths = Vec::new();
    for word in cmd_line.split_whitespace() {
        let clean = word.trim_matches('"').trim_matches('\'');
        if is_absolute_win_path(clean) || clean.contains('/') || clean.contains('\\') {
            if let Some(idx) = clean.to_lowercase().find("\\node_modules\\") {
                paths.push(clean[..idx].to_string());
            } else {
                paths.push(clean.to_string());
            }
        }
    }
    paths
}

fn resolve_directory_in_memory(
    proc: &RawProcess,
    all_procs: &HashMap<u32, RawProcess>,
) -> String {
    // Stage 1: Inspect process's own command line for direct paths
    if let Some(ref cmd) = proc.cmd_line {
        for p in extract_candidate_paths_from_cmd(cmd) {
            if let Some(root) = walk_up_to_project_root(std::path::Path::new(&p)) {
                return root;
            }
        }
    }

    // Stage 2: Walk parent process tree (up to 5 levels) 100% in-memory
    let mut curr_pid = proc.parent_pid;
    let mut depth = 0;
    while let Some(pid) = curr_pid {
        if depth >= 5 { break; }
        if let Some(parent) = all_procs.get(&pid) {
            if let Some(ref pcmd) = parent.cmd_line {
                for p in extract_candidate_paths_from_cmd(pcmd) {
                    if let Some(root) = walk_up_to_project_root(std::path::Path::new(&p)) {
                        return root;
                    }
                }
            }
            if let Some(ref pexec) = parent.exec_path {
                if let Some(root) = walk_up_to_project_root(std::path::Path::new(pexec)) {
                    return root;
                }
            }
            curr_pid = parent.parent_pid;
            depth += 1;
        } else {
            break;
        }
    }

    // Stage 3: Dynamic Script Fallback (for relative commands like `node server.js` or `python main.py`)
    if let Some(ref cmd) = proc.cmd_line {
        let lower = cmd.to_lowercase();
        let script_candidates = ["server.js", "app.js", "index.js", "main.js", "main.py", "app.py", "manage.py"];
        for script in script_candidates {
            if lower.contains(script) {
                let mut search_roots = Vec::new();
                if let Ok(cwd) = std::env::current_dir() {
                    search_roots.push(cwd);
                }
                if let Ok(user_profile) = std::env::var("USERPROFILE") {
                    search_roots.push(std::path::PathBuf::from(user_profile));
                }

                for root in search_roots {
                    let script_path = root.join(script);
                    if script_path.exists() {
                        if let Some(found_root) = walk_up_to_project_root(&root) {
                            return found_root;
                        }
                        return root.to_string_lossy().to_string();
                    }
                }
            }
        }
    }

    // Stage 4: Executable path fallback
    if let Some(ref exec) = proc.exec_path {
        if let Some(root) = walk_up_to_project_root(std::path::Path::new(exec)) {
            return root;
        }
    }

    "unknown".to_string()
}

#[tauri::command]
pub async fn resolve_process_directory(port: u16, pid: Option<u32>) -> Result<String, String> {
    let (port_to_pid, _) = get_listening_ports_map();
    let target_pid = pid.or_else(|| port_to_pid.get(&port).copied());

    if let Some(pid_val) = target_pid {
        let all_procs = get_all_processes_map();
        if let Some(proc) = all_procs.get(&pid_val) {
            let resolved = resolve_directory_in_memory(proc, &all_procs);
            if resolved != "unknown" {
                return Ok(resolved);
            }
        }
    }
    Err("Unable to resolve project directory for process".to_string())
}

/* ══════════════════════════════════════════════
   PROCESS SCANNER (Dynamic Full-Port Engine)
   ══════════════════════════════════════════════ */

#[tauri::command]
pub async fn scan_processes(bypass_cache: bool) -> Result<Vec<ProcessCandidate>, String> {
    let (port_to_pid, _) = get_listening_ports_map();
    if port_to_pid.is_empty() {
        return Ok(Vec::new());
    }

    let all_procs = get_all_processes_map();
    let mut candidates = Vec::new();
    let mut cache = RECON_PROCESS_CACHE.lock().await;

    // Retain only currently active listening ports in cache
    let active_ports: Vec<u16> = port_to_pid.keys().copied().collect();
    cache.retain(|port, _| active_ports.contains(port));

    // Sort ports deterministically
    let mut sorted_entries: Vec<(u16, u32)> = port_to_pid.into_iter().collect();
    sorted_entries.sort_by_key(|&(port, _)| port);

    for (port, pid) in sorted_entries {
        if !bypass_cache {
            if let Some(cached) = cache.get(&port) {
                candidates.push(cached.clone());
                continue;
            }
        }

        let proc_opt = all_procs.get(&pid);
        let proc_name = proc_opt.map(|p| p.name.as_str()).unwrap_or("Development server");
        let cmd_line = proc_opt.and_then(|p| p.cmd_line.as_deref());

        // Classify process: filter out system processes and infrastructure noise
        let (_runtime_label, framework_label) = match classify_process(proc_name, cmd_line) {
            ProcessType::Dev { runtime, framework } => {
                let fw = framework.unwrap_or_else(|| format!("{} App", runtime));
                (runtime, fw)
            }
            ProcessType::Infra { .. } => {
                // Background infra is skipped from dev service candidates
                continue;
            }
            ProcessType::SystemOrUnknown => {
                // System noise is skipped
                continue;
            }
        };

        let resolved_dir = if let Some(proc) = proc_opt {
            resolve_directory_in_memory(proc, &all_procs)
        } else {
            "unknown".to_string()
        };

        let exec_path = proc_opt.and_then(|p| p.exec_path.clone());

        let candidate = ProcessCandidate {
            id: format!("port-{}", port),
            name: if proc_name.ends_with(".exe") {
                proc_name.trim_end_matches(".exe").to_string()
            } else {
                proc_name.to_string()
            },
            port,
            pid: Some(pid),
            command: Some(format!("localhost:{}", port)),
            directory: Some(resolved_dir),
            executable: exec_path.or_else(|| Some("unknown".to_string())),
            framework: Some(framework_label),
            access: "ready".to_string(),
            uptime: Some("live".to_string()),
        };

        cache.insert(port, candidate.clone());
        candidates.push(candidate);
    }

    Ok(candidates)
}
