use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Default, Clone)]
pub struct SessionStats {
    pub total_requests: u64,
    pub success_2xx: u64,
    pub redirect_3xx: u64,
    pub client_err_4xx: u64,
    pub server_err_5xx: u64,
    pub total_duration_ms: u64,
}

pub fn print_stats(stats: &Arc<Mutex<SessionStats>>, started_at: std::time::Instant) {
    let s = {
        if let Ok(guard) = stats.try_lock() {
            guard.clone()
        } else {
            return;
        }
    };
    let uptime = started_at.elapsed();
    let uptime_str = format!("{}m {}s", uptime.as_secs() / 60, uptime.as_secs() % 60);
    let avg_latency = if s.total_requests > 0 {
        s.total_duration_ms / s.total_requests
    } else {
        0
    };

    println!("\n\x1b[1;36m┌── Live Tunnel Metrics ──────────────────────────┐\x1b[0m");
    println!("\x1b[1;36m│\x1b[0m Uptime          : \x1b[1m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", uptime_str);
    println!("\x1b[1;36m│\x1b[0m Total Requests  : \x1b[1m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", s.total_requests);
    println!("\x1b[1;36m│\x1b[0m Average Latency : \x1b[1m{}ms{:<28}\x1b[0m\x1b[1;36m│\x1b[0m", avg_latency, "");
    println!("\x1b[1;36m│\x1b[0m Success (2xx)   : \x1b[32m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", s.success_2xx);
    println!("\x1b[1;36m│\x1b[0m Redirect (3xx)  : \x1b[34m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", s.redirect_3xx);
    println!("\x1b[1;36m│\x1b[0m Client Err (4xx): \x1b[33m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", s.client_err_4xx);
    println!("\x1b[1;36m│\x1b[0m Server Err (5xx): \x1b[31m{:<30}\x1b[0m\x1b[1;36m│\x1b[0m", s.server_err_5xx);
    println!("\x1b[1;36m└─────────────────────────────────────────────────┘\x1b[0m\n");
}

pub fn print_hotkey_bar(show_traffic: bool) {
    let traffic_badge = if show_traffic {
        "\x1b[1;32mON\x1b[0m"
    } else {
        "\x1b[1;33mPAUSED\x1b[0m"
    };
    println!(
        "\x1b[90m[Hotkeys] o: Open Browser | c: Copy URL | q: QR Code | s: Live Stats | t: Traffic ({}) | l: Clear | Esc/Ctrl+C: Quit\x1b[0m\n",
        traffic_badge
    );
}

pub fn print_proxy_hotkey_bar(show_traffic: bool) {
    let traffic_badge = if show_traffic {
        "\x1b[1;32mON\x1b[0m"
    } else {
        "\x1b[1;33mPAUSED\x1b[0m"
    };
    println!(
        "\x1b[90m[Hotkeys] t: Traffic ({}) | l: Clear Screen | Esc / Ctrl+C: Quit\x1b[0m\n",
        traffic_badge
    );
}

pub fn print_colored_log_line(line: &str) {
    if line.contains("[REQ]") {
        println!("\x1b[1;33m{}\x1b[0m", line);
    } else if line.contains("[RES]") {
        if line.contains("status=2") || line.contains("status=3") {
            println!("\x1b[32m{}\x1b[0m", line);
        } else {
            println!("\x1b[31m{}\x1b[0m", line);
        }
    } else if line.contains("[WARN]") {
        println!("\x1b[33m{}\x1b[0m", line);
    } else if line.contains("[INFO]") {
        println!("\x1b[36m{}\x1b[0m", line);
    } else {
        println!("{}", line);
    }
}

pub fn format_qr_code(url: &str) -> Option<String> {
    let code = qrcode::QrCode::new(url.as_bytes()).ok()?;
    let rendered = code
        .render::<qrcode::render::unicode::Dense1x2>()
        .quiet_zone(true)
        .build();
    Some(rendered)
}

pub fn copy_to_clipboard(text: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::io::Write;
        let mut cmd = std::process::Command::new("clip");
        std::os::windows::process::CommandExt::creation_flags(&mut cmd, 0x08000000);
        if let Ok(mut child) = cmd.stdin(std::process::Stdio::piped()).spawn() {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
            }
            return child.wait().map(|s| s.success()).unwrap_or(false);
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        if let Ok(mut child) = std::process::Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
        {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
            }
            return child.wait().map(|s| s.success()).unwrap_or(false);
        }
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        use std::io::Write;
        for tool in &["wl-copy", "xclip", "xsel"] {
            let mut cmd = std::process::Command::new(tool);
            if *tool == "xclip" {
                cmd.arg("-selection").arg("clipboard");
            } else if *tool == "xsel" {
                cmd.arg("--clipboard").arg("--input");
            }
            cmd.stdin(std::process::Stdio::piped());
            if let Ok(mut child) = cmd.spawn() {
                if let Some(mut stdin) = child.stdin.take() {
                    let _ = stdin.write_all(text.as_bytes());
                }
                if child.wait().map(|s| s.success()).unwrap_or(false) {
                    return true;
                }
            }
        }
    }
    false
}

pub fn open_in_browser(url: &str) {
    let _ = proxync_core::storage::open_path_or_url(url);
}

pub fn elapsed_since(started_epoch_secs: u64) -> String {
    let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
    let diff = now_secs.saturating_sub(started_epoch_secs);
    format_duration_human(diff)
}

pub fn format_duration_human(secs: u64) -> String {
    if secs < 60 {
        format!("{}s", secs)
    } else if secs < 3600 {
        let m = secs / 60;
        let s = secs % 60;
        if s == 0 {
            format!("{}m", m)
        } else {
            format!("{}m {}s", m, s)
        }
    } else {
        let h = secs / 3600;
        let m = (secs % 3600) / 60;
        if m == 0 {
            format!("{}h", h)
        } else {
            format!("{}h {}m", h, m)
        }
    }
}

pub fn parse_duration_to_secs(input: &str) -> Option<u64> {
    let s = input.trim().to_lowercase();
    if s.ends_with('h') {
        let val: u64 = s[..s.len() - 1].trim().parse().ok()?;
        Some(val * 3600)
    } else if s.ends_with('m') {
        let val: u64 = s[..s.len() - 1].trim().parse().ok()?;
        Some(val * 60)
    } else if s.ends_with('s') {
        let val: u64 = s[..s.len() - 1].trim().parse().ok()?;
        Some(val)
    } else {
        s.parse::<u64>().ok()
    }
}

pub const DEFAULT_STANDBY_IDLE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(3600);

pub fn get_standby_idle_timeout() -> std::time::Duration {
    if let Ok(val) = std::env::var("PROXYNC_STANDBY_IDLE_TIMEOUT_SECS") {
        if let Ok(secs) = val.parse::<u64>() {
            return std::time::Duration::from_secs(secs);
        }
    }
    DEFAULT_STANDBY_IDLE_TIMEOUT
}

pub fn is_tunnel_closure_log_line(line: &str, port: u16) -> bool {
    let lower = line.to_lowercase();
    let is_closure = lower.contains("closed tunnel")
        || lower.contains("stopped tunnel")
        || lower.contains("tunnel terminated")
        || lower.contains("auto-closed")
        || lower.contains("automatically closed")
        || lower.contains("auto-expired");
    is_closure && contains_discrete_port(line, port)
}

// ponytail: zero-alloc stack buffer for u16 port string matching during high-frequency log scans.
pub fn contains_discrete_port(line: &str, port: u16) -> bool {
    let mut buf = [0u8; 5];
    let port_str = {
        use std::io::Write;
        let mut cursor = std::io::Cursor::new(&mut buf[..]);
        let _ = write!(cursor, "{}", port);
        let len = cursor.position() as usize;
        std::str::from_utf8(&buf[..len]).unwrap_or("")
    };
    if port_str.is_empty() {
        return false;
    }

    let prefixes = ["port ", ":", "("];
    for prefix in prefixes {
        let mut search_from = 0;
        while let Some(rel_pos) = line[search_from..].find(prefix) {
            let pos = search_from + rel_pos;
            let after_prefix = pos + prefix.len();
            if line[after_prefix..].starts_with(port_str) {
                let end = after_prefix + port_str.len();
                // Ensure the next char is not a digit (prevents 80 matching 8080 or 40 matching 4000)
                let is_end_of_token = line.as_bytes().get(end).map(|b| !b.is_ascii_digit()).unwrap_or(true);
                if is_end_of_token {
                    return true;
                }
            }
            search_from = pos + prefix.len();
        }
    }
    false
}

pub fn guess_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "webp" => "image/webp",
        "wasm" => "application/wasm",
        "pdf" => "application/pdf",
        "txt" => "text/plain; charset=utf-8",
        "xml" => "application/xml",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        _ => "application/octet-stream",
    }
}

pub fn truncate_str(s: &str, max: usize) -> String {
    let char_count = s.chars().count();
    if char_count > max {
        let keep = max.saturating_sub(3);
        let truncated: String = s.chars().take(keep).collect();
        format!("{}...", truncated)
    } else {
        s.to_string()
    }
}

pub fn truncate_path_tail(s: &str, max: usize) -> String {
    let char_count = s.chars().count();
    if char_count > max {
        let skip = char_count.saturating_sub(max.saturating_sub(3));
        let tail: String = s.chars().skip(skip).collect();
        format!("...{}", tail)
    } else {
        s.to_string()
    }
}

pub fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok()
            .or_else(|| {
                let drive = std::env::var("HOMEDRIVE").ok()?;
                let path  = std::env::var("HOMEPATH").ok()?;
                Some(format!("{}{}", drive, path))
            })
            .map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}

const IGNORED_DIR_NAMES: &[&str] = &[
    "node_modules",
    ".git",
    "target",         // Rust & Maven (Spring Boot)
    "dist",
    "out",            // Electron / Next.js static output
    "coverage",       // Test coverage reports
    ".next",
    ".venv",
    "venv",
    ".cache",
    "build",          // Gradle (Spring Boot) & React
    ".gradle",        // Gradle internal cache (Spring Boot)
    ".m2",            // Maven local repository (Spring Boot)
    "__pycache__",    // Python bytecode
    ".pytest_cache",  // Python test cache
    "bin",            // .NET / Java compiled output
    "obj",            // .NET intermediate objects
    ".yarn",          // Yarn v2+ cache
    ".pnpm-store",    // pnpm global/local store
    ".turbo",
    ".idea",
    ".vscode",
];

fn load_local_gitignore_dirs(root: &Path) -> Vec<String> {
    let gitignore = root.join(".gitignore");
    let mut dirs = Vec::new();
    if let Ok(content) = std::fs::read_to_string(gitignore) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('!') {
                continue;
            }
            let clean = trimmed.trim_matches(|c| c == '/' || c == '\\');
            // Collect single directory names without glob patterns or path separators
            if !clean.is_empty()
                && !clean.contains('*')
                && !clean.contains('?')
                && !clean.contains('[')
                && !clean.contains('/')
                && !clean.contains('\\')
            {
                dirs.push(clean.to_lowercase());
            }
        }
    }
    dirs
}

pub fn calculate_dir_size_with_cap(path: &Path, depth: usize, max_depth: usize, max_bytes: u64) -> u64 {
    let custom_ignored = if depth == 0 {
        load_local_gitignore_dirs(path)
    } else {
        Vec::new()
    };
    calculate_dir_size_internal(path, depth, max_depth, max_bytes, &custom_ignored)
}

fn calculate_dir_size_internal(
    path: &Path,
    depth: usize,
    max_depth: usize,
    max_bytes: u64,
    custom_ignored: &[String],
) -> u64 {
    if depth >= max_depth || max_bytes == 0 {
        return 0;
    }
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                // Ignore symlinks / junctions to avoid filesystem cycles or scanning foreign volumes
                if file_type.is_symlink() {
                    continue;
                }
                if file_type.is_dir() {
                    let name = entry.file_name();
                    let name_str = name.to_string_lossy();
                    let lower = name_str.to_lowercase();
                    if IGNORED_DIR_NAMES.iter().any(|&ig| ig.eq_ignore_ascii_case(&lower))
                        || custom_ignored.iter().any(|ig| ig == &lower)
                    {
                        continue;
                    }
                    let remaining = max_bytes.saturating_sub(total);
                    let sub_size = calculate_dir_size_internal(&entry.path(), depth + 1, max_depth, remaining, custom_ignored);
                    total = total.saturating_add(sub_size);
                    if total >= max_bytes {
                        return total;
                    }
                } else if file_type.is_file() {
                    if let Ok(meta) = entry.metadata() {
                        total = total.saturating_add(meta.len());
                        if total >= max_bytes {
                            return total;
                        }
                    }
                }
            }
        }
    }
    total
}

#[allow(dead_code)]
pub fn calculate_dir_size(path: &Path, depth: usize, max_depth: usize) -> u64 {
    calculate_dir_size_with_cap(path, depth, max_depth, u64::MAX)
}

pub struct RawModeGuard {
    active: bool,
}

impl RawModeGuard {
    pub fn new() -> Self {
        use std::io::IsTerminal;
        if std::io::stdin().is_terminal() {
            if crossterm::terminal::enable_raw_mode().is_ok() {
                #[cfg(unix)]
                {
                    // Preserve OPOST / ONLCR so standard println! doesn't suffer the raw-mode staircase indent bug
                    use std::os::unix::io::AsRawFd;
                    unsafe {
                        let fd = std::io::stdout().as_raw_fd();
                        let mut termios: libc::termios = std::mem::zeroed();
                        if libc::tcgetattr(fd, &mut termios) == 0 {
                            termios.c_oflag |= (libc::OPOST as libc::tcflag_t) | (libc::ONLCR as libc::tcflag_t);
                            libc::tcsetattr(fd, libc::TCSANOW, &termios);
                        }
                    }
                }
                return Self { active: true };
            }
        }
        Self { active: false }
    }

    pub fn is_active(&self) -> bool {
        self.active
    }
}

impl Drop for RawModeGuard {
    fn drop(&mut self) {
        if self.active {
            let _ = crossterm::execute!(std::io::stdout(), crossterm::cursor::Show);
            let _ = crossterm::terminal::disable_raw_mode();
        }
    }
}

pub fn interactive_port_picker(procs: &[proxync_core::recon::ProcessCandidate]) -> Result<u16, Box<dyn std::error::Error>> {
    use crossterm::{
        cursor,
        event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
        execute,
        style::{Color, Print, ResetColor, SetForegroundColor},
        terminal::{Clear, ClearType},
    };
    use std::io::{stdout, Write};

    let mut stdout = stdout();
    let _raw_guard = RawModeGuard::new();
    let _ = execute!(stdout, cursor::Hide);
    let mut selected_idx = 0;
    let up_lines = (procs.len() + 1) as u16;

    let render = |stdout: &mut std::io::Stdout, sel: usize, is_first: bool| -> Result<(), Box<dyn std::error::Error>> {
        if !is_first {
            execute!(stdout, cursor::MoveUp(up_lines), cursor::MoveToColumn(0))?;
        }
        execute!(stdout, cursor::MoveToColumn(0), Clear(ClearType::CurrentLine))?;
        execute!(stdout, Print("\r\x1b[1;36mMultiple dev servers detected. Select port to tunnel:\x1b[0m\r\n"))?;
        for (i, p) in procs.iter().enumerate() {
            let fw = p.framework.as_deref().unwrap_or(&p.name);
            let is_vite = fw.to_lowercase().contains("vite");
            let fw_display = if is_vite {
                format!("{} \x1b[33m(under dev)\x1b[0m", fw)
            } else {
                fw.to_string()
            };
            let dir = p.directory.as_deref().unwrap_or("");
            execute!(stdout, Clear(ClearType::CurrentLine))?;
            if i == sel {
                execute!(stdout, SetForegroundColor(Color::Cyan), Print(format!("  ➜ [{}] {:<6} {:<28} {}\r\n", i + 1, p.port, fw_display, dir)), ResetColor)?;
            } else {
                execute!(stdout, Print(format!("    [{}] {:<6} {:<28} {}\r\n", i + 1, p.port, fw_display, dir)))?;
            }
        }
        execute!(stdout, Clear(ClearType::CurrentLine), Print("  Use ↑/↓ arrows to select, Enter to confirm, Esc/Ctrl+C to cancel"))?;
        stdout.flush()?;
        Ok(())
    };

    render(&mut stdout, selected_idx, true)?;

    loop {
        if let Event::Key(key) = event::read()? {
            if key.kind == KeyEventKind::Press {
                match key.code {
                    KeyCode::Up => {
                        selected_idx = selected_idx.saturating_sub(1);
                        render(&mut stdout, selected_idx, false)?;
                    }
                    KeyCode::Down => {
                        if selected_idx + 1 < procs.len() {
                            selected_idx += 1;
                        }
                        render(&mut stdout, selected_idx, false)?;
                    }
                    KeyCode::Enter => {
                        execute!(
                            stdout,
                            cursor::MoveUp(up_lines),
                            cursor::MoveToColumn(0),
                            Clear(ClearType::FromCursorDown),
                            cursor::Show
                        )?;
                        return Ok(procs[selected_idx].port);
                    }
                    KeyCode::Esc | KeyCode::Char('q') => {
                        execute!(
                            stdout,
                            cursor::MoveUp(up_lines),
                            cursor::MoveToColumn(0),
                            Clear(ClearType::FromCursorDown),
                            cursor::Show
                        )?;
                        return Err("Selection cancelled by user.".into());
                    }
                    KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                        execute!(
                            stdout,
                            cursor::MoveUp(up_lines),
                            cursor::MoveToColumn(0),
                            Clear(ClearType::FromCursorDown),
                            cursor::Show
                        )?;
                        return Err("Selection cancelled by user (Ctrl+C).".into());
                    }
                    _ => {}
                }
            }
        }
    }
}
