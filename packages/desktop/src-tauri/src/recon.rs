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
pub(crate) struct RawProcess {
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
   PORT DISCOVERY & DEV FILTERING
   ══════════════════════════════════════════════ */

fn is_dev_port(port: u16) -> bool {
    // Exclude well-known system, RPC, mDNS, CUPS, and common non-dev ports
    match port {
        111 | 135 | 136 | 137 | 138 | 139 | 445 | 631 | 2869 | 5040 | 5353 | 6463 | 5357 | 49152..=49157 => false,
        80 | 443 | 1024..=49151 => true,
        _ => false,
    }
}

/* ══════════════════════════════════════════════
   CROSS-PLATFORM SCANNER TRAIT & FACTORY
   ══════════════════════════════════════════════ */

pub trait PlatformScanner: Send + Sync {
    fn scan_listening_ports(&self) -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>);
    fn scan_processes(&self) -> HashMap<u32, RawProcess>;
    fn get_process_cwd(&self, pid: u32) -> Option<String>;
}

#[cfg(target_os = "linux")]
fn get_platform_scanner() -> &'static dyn PlatformScanner {
    static SCANNER: LinuxScanner = LinuxScanner;
    &SCANNER
}

#[cfg(target_os = "windows")]
fn get_platform_scanner() -> &'static dyn PlatformScanner {
    static SCANNER: WindowsScanner = WindowsScanner;
    &SCANNER
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn get_platform_scanner() -> &'static dyn PlatformScanner {
    static SCANNER: FallbackScanner = FallbackScanner;
    &SCANNER
}

/* ══════════════════════════════════════════════
   LINUX SCANNER (In-Memory /proc + ss)
   ══════════════════════════════════════════════ */

#[cfg(target_os = "linux")]
struct LinuxScanner;

#[cfg(target_os = "linux")]
impl PlatformScanner for LinuxScanner {
    fn scan_listening_ports(&self) -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
        // Primary: ss -tlpn -H
        let (mut port_to_pid, mut pid_to_ports) = parse_ss_listening_ports();

        // Fallback: in-kernel /proc/net/tcp{,6} + /proc/[pid]/fd socket inode matching
        if port_to_pid.is_empty() {
            let (proc_p2p, proc_pid2p) = parse_proc_listening_ports();
            port_to_pid = proc_p2p;
            pid_to_ports = proc_pid2p;
        }

        // Ghost port prevention: filter out Proxync's own PID
        let self_pid = std::process::id();
        port_to_pid.retain(|_, &mut pid| pid != self_pid);
        pid_to_ports.remove(&self_pid);

        (port_to_pid, pid_to_ports)
    }

    fn scan_processes(&self) -> HashMap<u32, RawProcess> {
        let mut map = HashMap::new();
        let entries = match std::fs::read_dir("/proc") {
            Ok(e) => e,
            Err(_) => return map,
        };

        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let pid_str = match file_name.to_str() {
                Some(s) => s,
                None => continue,
            };
            let pid: u32 = match pid_str.parse() {
                Ok(p) => p,
                Err(_) => continue,
            };

            let proc_dir = entry.path();

            // 1. Process name: try /proc/[pid]/comm, fallback to stat
            let mut name = std::fs::read_to_string(proc_dir.join("comm"))
                .map(|s| s.trim().to_string())
                .unwrap_or_default();

            // 2. Parent PID & name fallback: parse /proc/[pid]/stat
            let mut parent_pid = None;
            if let Ok(stat_content) = std::fs::read_to_string(proc_dir.join("stat")) {
                if let Some(rparen) = stat_content.rfind(')') {
                    let rest = &stat_content[rparen + 1..];
                    let fields: Vec<&str> = rest.split_whitespace().collect();
                    if fields.len() >= 2 {
                        if let Ok(ppid) = fields[1].parse::<u32>() {
                            parent_pid = Some(ppid);
                        }
                    }
                    if name.is_empty() {
                        if let Some(lparen) = stat_content.find('(') {
                            name = stat_content[lparen + 1..rparen].to_string();
                        }
                    }
                }
            }

            // 3. Command line: /proc/[pid]/cmdline (arguments separated by \0)
            let cmd_line = match std::fs::read(proc_dir.join("cmdline")) {
                Ok(bytes) if !bytes.is_empty() => {
                    let parts: Vec<String> = bytes
                        .split(|&b| b == 0)
                        .filter(|slice| !slice.is_empty())
                        .map(|slice| String::from_utf8_lossy(slice).trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    if parts.is_empty() {
                        None
                    } else {
                        Some(parts.join(" "))
                    }
                }
                _ => None,
            };

            // 4. Executable path: readlink /proc/[pid]/exe
            let exec_path = std::fs::read_link(proc_dir.join("exe"))
                .ok()
                .map(|p| p.to_string_lossy().to_string());

            map.insert(pid, RawProcess {
                pid,
                parent_pid,
                name,
                exec_path,
                cmd_line,
            });
        }

        map
    }

    fn get_process_cwd(&self, pid: u32) -> Option<String> {
        if let Ok(path) = std::fs::read_link(format!("/proc/{}/cwd", pid)) {
            let s = path.to_string_lossy().to_string();
            if !s.is_empty() {
                return Some(s);
            }
        }
        None
    }
}

#[cfg(target_os = "linux")]
fn parse_ss_listening_ports() -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
    let mut port_to_pid = HashMap::new();
    let mut pid_to_ports = HashMap::new();

    let output = match std::process::Command::new("ss")
        .args(&["-tlpn", "-H"])
        .output()
    {
        Ok(out) if out.status.success() => out,
        _ => return (port_to_pid, pid_to_ports),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("LISTEN") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        // ss -tlpn -H columns: state recv-q send-q local-addr peer-addr [users]
        let local_addr = parts[3];
        let port_opt = local_addr.rsplit(':').next().and_then(|s| {
            let clean = s.trim_matches(|c: char| !c.is_ascii_digit());
            clean.parse::<u16>().ok()
        });

        let port = match port_opt {
            Some(p) if is_dev_port(p) => p,
            _ => continue,
        };

        // Parse PID(s) from users:(("...",pid=1234,...))
        let mut pids = Vec::new();
        for chunk in line.split("pid=") {
            let digits: String = chunk.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(pid) = digits.parse::<u32>() {
                if pid > 0 && !pids.contains(&pid) {
                    pids.push(pid);
                }
            }
        }

        for pid in pids {
            port_to_pid.insert(port, pid);
            pid_to_ports.entry(pid).or_insert_with(Vec::new).push(port);
        }
    }

    (port_to_pid, pid_to_ports)
}

#[cfg(target_os = "linux")]
fn parse_proc_listening_ports() -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
    let mut port_to_pid = HashMap::new();
    let mut pid_to_ports = HashMap::new();
    let mut inode_to_port: HashMap<u64, u16> = HashMap::new();

    for tcp_path in &["/proc/net/tcp", "/proc/net/tcp6"] {
        if let Ok(content) = std::fs::read_to_string(tcp_path) {
            for line in content.lines().skip(1) {
                // /proc/net/tcp columns: sl local_addr remote_addr st tx_q:rx_q ... inode
                // parts[3] = "0A" means TCP_LISTEN state; parts[1] = hex local_addr:port; parts[9] = socket inode
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() > 9 && parts[3] == "0A" {
                    if let Some(port_hex) = parts[1].rsplit(':').next() {
                        if let Ok(port) = u16::from_str_radix(port_hex, 16) {
                            if is_dev_port(port) {
                                if let Ok(inode) = parts[9].parse::<u64>() {
                                    inode_to_port.insert(inode, port);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if inode_to_port.is_empty() {
        return (port_to_pid, pid_to_ports);
    }

    // Correlate inode with /proc/[pid]/fd socket links
    if let Ok(proc_entries) = std::fs::read_dir("/proc") {
        for proc_entry in proc_entries.flatten() {
            let pid_str = match proc_entry.file_name().to_str() {
                Some(s) => s.to_string(),
                None => continue,
            };
            let pid: u32 = match pid_str.parse() {
                Ok(p) => p,
                Err(_) => continue,
            };

            let fd_dir = proc_entry.path().join("fd");
            if let Ok(fd_entries) = std::fs::read_dir(fd_dir) {
                for fd_entry in fd_entries.flatten() {
                    if let Ok(target) = std::fs::read_link(fd_entry.path()) {
                        let target_str = target.to_string_lossy();
                        if target_str.starts_with("socket:[") && target_str.ends_with(']') {
                            let inode_str = &target_str[8..target_str.len() - 1];
                            if let Ok(inode) = inode_str.parse::<u64>() {
                                if let Some(&port) = inode_to_port.get(&inode) {
                                    port_to_pid.insert(port, pid);
                                    pid_to_ports.entry(pid).or_insert_with(Vec::new).push(port);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    (port_to_pid, pid_to_ports)
}

/* ══════════════════════════════════════════════
   WINDOWS SCANNER (WMI / PowerShell & netstat)
   ══════════════════════════════════════════════ */

#[cfg(target_os = "windows")]
struct WindowsScanner;

#[cfg(target_os = "windows")]
impl PlatformScanner for WindowsScanner {
    fn scan_listening_ports(&self) -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
        let mut port_to_pid = HashMap::new();
        let mut pid_to_ports = HashMap::new();

        let mut cmd = std::process::Command::new("netstat");
        cmd.creation_flags(0x08000000);

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

        // Ghost port prevention: filter out Proxync's own PID
        let self_pid = std::process::id();
        port_to_pid.retain(|_, &mut pid| pid != self_pid);
        pid_to_ports.remove(&self_pid);

        (port_to_pid, pid_to_ports)
    }

    fn scan_processes(&self) -> HashMap<u32, RawProcess> {
        let mut map = HashMap::new();
        let ps_cmd = "$procs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine; $procs | ConvertTo-Json -Depth 2";

        let mut cmd = std::process::Command::new("powershell");
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

    fn get_process_cwd(&self, pid: u32) -> Option<String> {
        win_peb::get_process_cwd(pid)
    }
}

/* ══════════════════════════════════════════════
   FALLBACK SCANNER (macOS / Unix)
   ══════════════════════════════════════════════ */

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
struct FallbackScanner;

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
impl PlatformScanner for FallbackScanner {
    fn scan_listening_ports(&self) -> (HashMap<u16, u32>, HashMap<u32, Vec<u16>>) {
        let mut port_to_pid = HashMap::new();
        let mut pid_to_ports = HashMap::new();

        if let Ok(output) = std::process::Command::new("lsof")
            .args(&["-iTCP", "-sTCP:LISTEN", "-P", "-n"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 9 {
                    if let Ok(pid) = parts[1].parse::<u32>() {
                        let addr = parts[parts.len() - 2];
                        if let Some(port_str) = addr.rsplit(':').next() {
                            let clean = port_str.trim_matches(|c: char| !c.is_ascii_digit());
                            if let Ok(port) = clean.parse::<u16>() {
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

        // Ghost port prevention: filter out Proxync's own PID
        let self_pid = std::process::id();
        port_to_pid.retain(|_, &mut pid| pid != self_pid);
        pid_to_ports.remove(&self_pid);

        (port_to_pid, pid_to_ports)
    }

    fn scan_processes(&self) -> HashMap<u32, RawProcess> {
        HashMap::new()
    }

    fn get_process_cwd(&self, _pid: u32) -> Option<String> {
        None
    }
}

#[tauri::command]
pub async fn scan_ports() -> Result<Vec<u16>, String> {
    let (port_to_pid, _) = get_platform_scanner().scan_listening_ports();
    let mut ports: Vec<u16> = port_to_pid.into_keys().collect();
    ports.sort_unstable();
    Ok(ports)
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
        || lower.starts_with("systemd")
        || lower.starts_with("avahi-daemon")
        || lower.starts_with("cupsd")
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
    } else if lower.contains("@nestjs\\cli") || lower.contains("@nestjs/cli") || lower.contains("nest start") || (lower.contains("dist\\src") && lower.contains("node")) || (lower.contains("dist/src") && lower.contains("node")) {
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
    if lower_name.starts_with("vite") {
        return ProcessType::Dev {
            runtime: "Node.js".to_string(),
            framework: Some("Vite Dev Server".to_string()),
        };
    }
    if lower_name.starts_with("fastapi") {
        return ProcessType::Dev {
            runtime: "Python".to_string(),
            framework: Some("FastAPI App".to_string()),
        };
    }
    if lower_name.starts_with("uvicorn") || lower_name.starts_with("gunicorn") {
        let fw = cmd_line.and_then(detect_framework).unwrap_or_else(|| "FastAPI App".to_string());
        return ProcessType::Dev {
            runtime: "Python".to_string(),
            framework: Some(fw),
        };
    }

    let runtime = if lower_name.starts_with("node") {
        "Node.js"
    } else if lower_name.starts_with("python") {
        "Python"
    } else if lower_name.starts_with("deno") {
        "Deno"
    } else if lower_name.starts_with("bun") {
        "Bun"
    } else if lower_name.starts_with("java") {
        "Java"
    } else if lower_name.starts_with("go") || lower_name == "main.exe" || lower_name == "main" {
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

fn is_absolute_unix_path(s: &str) -> bool {
    s.starts_with('/')
}

fn is_system_installation_dir(path_str: &str) -> bool {
    let lower = path_str.to_lowercase();
    lower.contains("/.nvm")
        || lower.contains("\\.nvm")
        || lower.contains("/nvm")
        || lower.contains("\\nvm")
        || lower.contains("/nodejs")
        || lower.contains("\\nodejs")
        || lower.contains("/site-packages")
        || lower.contains("\\site-packages")
        || lower.contains("/dist-packages")
        || lower.contains("\\dist-packages")
        || lower.starts_with("/usr")
        || lower.starts_with("/bin")
        || lower.starts_with("/sbin")
        || lower.starts_with("/lib")
        || lower.starts_with("/opt")
        || lower.starts_with("/etc")
        || lower.contains("\\appdata")
        || lower.contains("\\program files")
        || lower.contains("\\windows")
        || lower.contains("\\system32")
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
        if is_absolute_win_path(clean) || is_absolute_unix_path(clean) || clean.contains('/') || clean.contains('\\') {
            let lower = clean.to_lowercase();
            if let Some(idx) = lower.find("/node_modules/").or_else(|| lower.find("\\node_modules\\")) {
                paths.push(clean[..idx].to_string());
            } else {
                paths.push(clean.to_string());
            }
        }
    }
    paths
}

#[cfg(target_os = "windows")]
mod win_peb {
    use std::ffi::c_void;
    use std::mem::size_of;

    type HANDLE = *mut c_void;
    type NTSTATUS = i32;

    const PROCESS_QUERY_INFORMATION: u32 = 0x0400;
    const PROCESS_VM_READ: u32 = 0x0010;

    #[repr(C)]
    struct ProcessBasicInformation {
        _exit_status: *mut c_void,
        peb_base_address: *mut c_void,
        _affinity_mask: *mut c_void,
        _base_priority: *mut c_void,
        _unique_process_id: *mut c_void,
        _inherited_from_unique_process_id: *mut c_void,
    }

    extern "system" {
        fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> HANDLE;
        fn CloseHandle(hObject: HANDLE) -> i32;
        fn ReadProcessMemory(
            hProcess: HANDLE,
            lpBaseAddress: *const c_void,
            lpBuffer: *mut c_void,
            nSize: usize,
            lpNumberOfBytesRead: *mut usize,
        ) -> i32;
        fn GetModuleHandleA(lpModuleName: *const u8) -> *mut c_void;
        fn GetProcAddress(hModule: *mut c_void, lpProcName: *const u8) -> *mut c_void;
    }

    type NtQueryInformationProcessFn = unsafe extern "system" fn(
        process_handle: HANDLE,
        process_information_class: i32,
        process_information: *mut c_void,
        process_information_length: u32,
        return_length: *mut u32,
    ) -> NTSTATUS;

    pub fn get_process_cwd(pid: u32) -> Option<String> {
        unsafe {
            let ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
            if ntdll.is_null() {
                return None;
            }
            let func_ptr = GetProcAddress(ntdll, b"NtQueryInformationProcess\0".as_ptr());
            if func_ptr.is_null() {
                return None;
            }
            let nt_query_info_proc: NtQueryInformationProcessFn = std::mem::transmute(func_ptr);

            let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
            if handle.is_null() {
                return None;
            }

            let mut pbi = std::mem::zeroed::<ProcessBasicInformation>();
            let mut ret_len = 0u32;
            let status = nt_query_info_proc(
                handle,
                0, // ProcessBasicInformation
                &mut pbi as *mut _ as *mut c_void,
                size_of::<ProcessBasicInformation>() as u32,
                &mut ret_len,
            );

            if status != 0 || pbi.peb_base_address.is_null() {
                CloseHandle(handle);
                return None;
            }

            // In 64-bit Windows: PEB.ProcessParameters offset is 0x20
            // In 32-bit Windows: PEB.ProcessParameters offset is 0x10
            let params_offset = if size_of::<usize>() == 8 { 0x20 } else { 0x10 };
            let mut process_params_ptr: usize = 0;
            let mut bytes_read = 0usize;

            let read_ok = ReadProcessMemory(
                handle,
                (pbi.peb_base_address as usize + params_offset) as *const c_void,
                &mut process_params_ptr as *mut _ as *mut c_void,
                size_of::<usize>(),
                &mut bytes_read,
            );

            if read_ok == 0 || process_params_ptr == 0 {
                CloseHandle(handle);
                return None;
            }

            // In RTL_USER_PROCESS_PARAMETERS:
            // 64-bit: CurrentDirectory.DosPath is UNICODE_STRING at offset 0x38 (Length: u16, MaxLen: u16, Pad: 4 bytes, Buffer: usize at 0x40)
            // 32-bit: CurrentDirectory.DosPath is UNICODE_STRING at offset 0x24 (Length: u16, MaxLen: u16, Buffer: usize at 0x28)
            let (cur_dir_offset, buf_ptr_offset) = if size_of::<usize>() == 8 {
                (0x38, 0x40)
            } else {
                (0x24, 0x28)
            };

            let mut length: u16 = 0;
            let read_len_ok = ReadProcessMemory(
                handle,
                (process_params_ptr + cur_dir_offset) as *const c_void,
                &mut length as *mut _ as *mut c_void,
                2,
                &mut bytes_read,
            );

            if read_len_ok == 0 || length == 0 || length > 4096 {
                CloseHandle(handle);
                return None;
            }

            let mut buffer_ptr: usize = 0;
            let read_buf_ptr_ok = ReadProcessMemory(
                handle,
                (process_params_ptr + buf_ptr_offset) as *const c_void,
                &mut buffer_ptr as *mut _ as *mut c_void,
                size_of::<usize>(),
                &mut bytes_read,
            );

            if read_buf_ptr_ok == 0 || buffer_ptr == 0 {
                CloseHandle(handle);
                return None;
            }

            let char_count = (length / 2) as usize;
            let mut utf16_buf: Vec<u16> = vec![0u16; char_count];
            let read_path_ok = ReadProcessMemory(
                handle,
                buffer_ptr as *const c_void,
                utf16_buf.as_mut_ptr() as *mut c_void,
                length as usize,
                &mut bytes_read,
            );

            CloseHandle(handle);

            if read_path_ok != 0 {
                let raw_str = String::from_utf16_lossy(&utf16_buf);
                let trimmed = raw_str.trim_matches('\0').trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }

            None
        }
    }
}

fn resolve_directory_in_memory(
    proc: &RawProcess,
    all_procs: &HashMap<u32, RawProcess>,
) -> String {
    // Stage 0: Direct Process CWD via OS PEB / /proc inspection (primary high-precision resolver)
    if let Some(cwd) = get_platform_scanner().get_process_cwd(proc.pid) {
        let path = std::path::Path::new(&cwd);
        if let Some(root) = walk_up_to_project_root(path) {
            return root;
        }
        if path.exists() && path.is_dir() && !is_system_installation_dir(&cwd) {
            return cwd.trim_end_matches('\\').trim_end_matches('/').to_string();
        }
    }

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

        if let Some(parent_cwd) = get_platform_scanner().get_process_cwd(pid) {
            let path = std::path::Path::new(&parent_cwd);
            if let Some(root) = walk_up_to_project_root(path) {
                return root;
            }
            if path.exists() && path.is_dir() && !is_system_installation_dir(&parent_cwd) {
                return parent_cwd.trim_end_matches('\\').trim_end_matches('/').to_string();
            }
        }

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
                if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
                    search_roots.push(std::path::PathBuf::from(home));
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
    let scanner = get_platform_scanner();
    let (port_to_pid, _) = scanner.scan_listening_ports();
    let target_pid = pid.or_else(|| port_to_pid.get(&port).copied());

    if let Some(pid_val) = target_pid {
        let all_procs = scanner.scan_processes();
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
    let scanner = get_platform_scanner();
    let (port_to_pid, _) = scanner.scan_listening_ports();
    if port_to_pid.is_empty() {
        return Ok(Vec::new());
    }

    let all_procs = scanner.scan_processes();
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

#[tauri::command]
pub async fn probe_port(port: u16) -> Result<bool, String> {
    let addr_v4: std::net::SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    if tokio::time::timeout(std::time::Duration::from_millis(300), tokio::net::TcpStream::connect(&addr_v4)).await.is_ok_and(|r| r.is_ok()) {
        return Ok(true);
    }
    let addr_v6: std::net::SocketAddr = format!("[::1]:{}", port).parse().unwrap();
    if tokio::time::timeout(std::time::Duration::from_millis(300), tokio::net::TcpStream::connect(&addr_v6)).await.is_ok_and(|r| r.is_ok()) {
        return Ok(true);
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_dev_port() {
        // Excluded system / noise ports
        assert!(!is_dev_port(111));
        assert!(!is_dev_port(135));
        assert!(!is_dev_port(445));
        assert!(!is_dev_port(631));
        assert!(!is_dev_port(5353));
        assert!(!is_dev_port(49152));

        // Allowed dev ports
        assert!(is_dev_port(80));
        assert!(is_dev_port(443));
        assert!(is_dev_port(3000));
        assert!(is_dev_port(5173));
        assert!(is_dev_port(8000));
        assert!(is_dev_port(8080));
    }

    #[test]
    fn test_path_detection() {
        assert!(is_absolute_unix_path("/usr/bin/node"));
        assert!(is_absolute_unix_path("/home/user/project"));
        assert!(!is_absolute_unix_path("relative/path"));
        assert!(!is_absolute_unix_path("./path"));

        assert!(is_system_installation_dir("/usr/lib/node_modules"));
        assert!(is_system_installation_dir("/usr/bin"));
        assert!(is_system_installation_dir("/home/user/.nvm/versions/node"));
        assert!(!is_system_installation_dir("/home/user/my-cool-project"));
    }

    #[test]
    fn test_framework_detection() {
        assert_eq!(detect_framework("vite --port 5173").as_deref(), Some("Vite Dev Server"));
        assert_eq!(detect_framework("python3 -m uvicorn main:app").as_deref(), Some("FastAPI App"));
        assert_eq!(detect_framework("node server.js").as_deref(), Some("Node.js / Express"));
        assert_eq!(detect_framework("next dev").as_deref(), Some("Next.js App"));
        assert_eq!(detect_framework("unknown_tool").as_deref(), None);
    }

    #[test]
    fn test_classify_process() {
        match classify_process("vite", None) {
            ProcessType::Dev { runtime, framework } => {
                assert_eq!(runtime, "Node.js");
                assert_eq!(framework.as_deref(), Some("Vite Dev Server"));
            }
            _ => panic!("Expected Dev process for vite"),
        }

        match classify_process("fastapi", None) {
            ProcessType::Dev { runtime, framework } => {
                assert_eq!(runtime, "Python");
                assert_eq!(framework.as_deref(), Some("FastAPI App"));
            }
            _ => panic!("Expected Dev process for fastapi"),
        }

        match classify_process("python3", Some("python3 -m uvicorn main:app")) {
            ProcessType::Dev { runtime, framework } => {
                assert_eq!(runtime, "Python");
                assert_eq!(framework.as_deref(), Some("FastAPI App"));
            }
            _ => panic!("Expected Dev process for python3 + uvicorn"),
        }

        match classify_process("node", Some("node index.js")) {
            ProcessType::Dev { runtime, framework } => {
                assert_eq!(runtime, "Node.js");
                assert_eq!(framework.as_deref(), Some("Node.js / Express"));
            }
            _ => panic!("Expected Dev process for node"),
        }

        match classify_process("cupsd", None) {
            ProcessType::SystemOrUnknown => {}
            _ => panic!("Expected SystemOrUnknown for cupsd"),
        }

        match classify_process("docker", None) {
            ProcessType::Infra { name } => assert_eq!(name, "docker"),
            _ => panic!("Expected Infra for docker"),
        }
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn test_linux_scanner_self_process() {
        let scanner = get_platform_scanner();
        let procs = scanner.scan_processes();
        let self_pid = std::process::id();
        assert!(procs.contains_key(&self_pid), "Scanner should find current process");

        let cwd = scanner.get_process_cwd(self_pid);
        assert!(cwd.is_some(), "Scanner should find cwd for current process");
    }

    #[tokio::test]
    #[cfg(target_os = "linux")]
    async fn test_scan_ports_and_processes_live() {
        use std::process::Command;
        let mut child = Command::new("python3")
            .args(&["-m", "http.server", "8998"])
            .spawn()
            .expect("Failed to start python on 8998");

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        let ports = scan_ports().await.expect("scan_ports failed");
        assert!(ports.contains(&8998), "scan_ports should detect live listening port 8998");

        let procs = scan_processes(true).await.expect("scan_processes failed");
        let candidate = procs.iter().find(|p| p.port == 8998);
        assert!(candidate.is_some(), "scan_processes should find candidate on port 8998");

        let cand = candidate.unwrap();
        assert_eq!(cand.port, 8998);
        assert_eq!(cand.pid, Some(child.id()));
        assert_eq!(cand.access, "ready");

        let _ = child.kill();
    }

    #[tokio::test]
    #[cfg(target_os = "linux")]
    async fn test_scan_multiple_dev_servers() {
        use std::process::Command;

        let mut py_child = Command::new("python3")
            .args(&["-m", "http.server", "8000"])
            .spawn()
            .expect("Failed to start python http.server");

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        let ports = scan_ports().await.expect("scan_ports failed");
        assert!(ports.contains(&8000), "scan_ports should find python on port 8000");

        let procs = scan_processes(true).await.expect("scan_processes failed");
        let py_proc = procs.iter().find(|p| p.port == 8000);
        assert!(py_proc.is_some(), "scan_processes should identify python candidate");
        let cand = py_proc.unwrap();
        assert_eq!(cand.port, 8000);
        assert!(cand.name.to_lowercase().contains("python"));
        assert!(cand.pid.is_some());

        let _ = py_child.kill();
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn test_self_pid_filter() {
        use std::net::TcpListener;
        // Bind a dev port inside the Proxync test process itself
        let _listener = TcpListener::bind("127.0.0.1:8997").expect("Failed to bind 8997");

        // Proxync's own ephemeral sockets must not appear in scan results
        let scanner = get_platform_scanner();
        let (port_to_pid, pid_to_ports) = scanner.scan_listening_ports();
        let self_pid = std::process::id();
        assert!(
            !port_to_pid.contains_key(&8997),
            "scan_listening_ports must filter out ports bound by Proxync itself"
        );
        assert!(
            !port_to_pid.values().any(|&pid| pid == self_pid),
            "scan_listening_ports must not include any port owned by the Proxync process itself"
        );
        assert!(
            !pid_to_ports.contains_key(&self_pid),
            "pid_to_ports must not contain the Proxync self-PID"
        );
    }
}
