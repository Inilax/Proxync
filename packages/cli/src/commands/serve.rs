use crate::args::{ServeArgs, TunnelArgs};
use crate::commands::tunnel::handle_tunnel;
use crate::ui::{calculate_dir_size_with_cap, get_home_dir, guess_mime_type};
use std::path::PathBuf;

pub async fn handle_serve(args: ServeArgs) -> Result<(), Box<dyn std::error::Error>> {
    let dir = std::path::Path::new(&args.path);
    if !dir.exists() || !dir.is_dir() {
        eprintln!("\x1b[1;31m[!] Error: Path '{}' does not exist or is not a directory.\x1b[0m", args.path);
        return Err("Invalid directory path".into());
    }

    let abs_dir = std::fs::canonicalize(dir)?;

    // Guard 1: Root / Sensitive System Directory Blacklist
    let sensitive_roots: Vec<PathBuf> = vec![
        PathBuf::from("/"),
        PathBuf::from("/etc"),
        PathBuf::from("/var"),
        PathBuf::from("/usr"),
        PathBuf::from("/bin"),
        PathBuf::from("/sbin"),
        PathBuf::from("C:\\"),
        PathBuf::from("C:\\Windows"),
        PathBuf::from("C:\\Program Files"),
        PathBuf::from("C:\\Program Files (x86)"),
    ]
    .into_iter()
    .filter_map(|p| std::fs::canonicalize(&p).ok().or(Some(p)))
    .collect();

    if sensitive_roots.iter().any(|r| abs_dir == *r) {
        eprintln!("\x1b[1;31m[!] Security Error: Refusing to publicly serve critical system directory: {}\x1b[0m", abs_dir.display());
        eprintln!("    Serving system roots or critical operating system paths over public tunnels is strictly prohibited.");
        return Err("Security violation: sensitive root directory".into());
    }

    // Guard 2: Home Directory Warning
    if let Some(home) = get_home_dir() {
        if let Ok(canon_home) = std::fs::canonicalize(&home) {
            if abs_dir == canon_home && !args.allow_large {
                eprintln!("\x1b[1;33m[!] Warning: You are about to serve your entire user home directory publicly: {}\x1b[0m", abs_dir.display());
                eprintln!("    This will expose all files, documents, and credentials in your profile.");
                eprintln!("    To proceed intentionally, pass \x1b[1m--allow-large\x1b[0m.");
                return Err("Serving user home directory requires --allow-large confirmation.".into());
            }
        }
    }

    // Guard 3: Directory Size Cap (1GB maximum default)
    if !args.allow_large {
        const MAX_DIR_SIZE: u64 = 1024 * 1024 * 1024; // 1 GB
        let total_bytes = calculate_dir_size_with_cap(&abs_dir, 0, 8, MAX_DIR_SIZE + 1);
        if total_bytes > MAX_DIR_SIZE {
            let size_mb = total_bytes / (1024 * 1024);
            eprintln!("\x1b[1;31m[!] Error: Directory size ({} MB) exceeds the 1 GB safety cap for static hosting.\x1b[0m", size_mb);
            eprintln!("    Serving massive directories or disk volumes over edge tunnels can saturate your bandwidth.");
            eprintln!("    To intentionally serve this directory anyway, pass the \x1b[1m--allow-large\x1b[0m flag.");
            return Err("Directory exceeds 1GB limit. Use --allow-large to bypass.".into());
        }
    }

    use tokio::net::TcpListener;

    let listener = if args.port > 0 {
        let addr = format!("127.0.0.1:{}", args.port);
        match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("\x1b[1;31m[!] Error: Failed to bind static server on {}: {}\x1b[0m", addr, e);
                return Err(e.into());
            }
        }
    } else {
        // Attempt standard dev ports before falling back to ephemeral port 0
        let candidate_ports = [8000, 3000, 5000, 8080, 5173, 4000, 8888];
        let mut bound = None;
        for &cand in &candidate_ports {
            if let Ok(l) = TcpListener::bind(format!("127.0.0.1:{}", cand)).await {
                bound = Some(l);
                break;
            }
        }
        match bound {
            Some(l) => l,
            None => match TcpListener::bind("127.0.0.1:0").await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("\x1b[1;31m[!] Error: Failed to bind static server on ephemeral port: {}\x1b[0m", e);
                    return Err(e.into());
                }
            },
        }
    };
    let local_port = listener.local_addr()?.port();
    let serve_root = abs_dir.clone();

    // Start background mini HTTP static file server
    let allow_large = args.allow_large;
    tokio::spawn(async move {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        loop {
            let (mut socket, _) = match listener.accept().await {
                Ok(conn) => conn,
                Err(_) => break,
            };

            let root = serve_root.clone();
            tokio::spawn(async move {
                let mut buf = vec![0u8; 4096];
                let n = match socket.read(&mut buf).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };

                let req_str = String::from_utf8_lossy(&buf[..n]);
                let first_line = req_str.lines().next().unwrap_or("");
                let mut parts = first_line.split_whitespace();
                let method = parts.next().unwrap_or("GET");
                let raw_path = parts.next().unwrap_or("/");

                if method != "GET" && method != "HEAD" {
                    let res = "HTTP/1.1 405 Method Not Allowed\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 0\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                    let _ = socket.write_all(res.as_bytes()).await;
                    return;
                }

                // Decode URL path
                let path_clean = raw_path.split('?').next().unwrap_or("/");
                let relative = percent_decode(path_clean.trim_start_matches('/'));
                let mut target_file = root.join(&relative);

                if target_file.is_dir() {
                    target_file = target_file.join("index.html");
                }

                // Security: Prevent path traversal attacks (e.g. /../../etc/passwd)
                let canon_target = match target_file.canonicalize() {
                    Ok(p) => p,
                    Err(_) => {
                        let res = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 13\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n404 Not Found";
                        let _ = socket.write_all(res.as_bytes()).await;
                        return;
                    }
                };

                if !canon_target.starts_with(&root) {
                    let res = "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 13\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n403 Forbidden";
                    let _ = socket.write_all(res.as_bytes()).await;
                    return;
                }

                // Guard 4: Per-File Size Cap (50MB maximum unless --allow-large)
                const MAX_SINGLE_FILE_SIZE: u64 = 50 * 1024 * 1024; // 50MB
                if let Ok(meta) = canon_target.metadata() {
                    if meta.len() > MAX_SINGLE_FILE_SIZE && !allow_large {
                        let res = "HTTP/1.1 413 Payload Too Large\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 72\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n413 Payload Too Large (File exceeds 50MB cap. Pass --allow-large to host).";
                        let _ = socket.write_all(res.as_bytes()).await;
                        return;
                    }
                }

                match tokio::fs::read(&canon_target).await {
                    Ok(contents) => {
                        let mime = guess_mime_type(&canon_target);
                        let header = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
                            mime,
                            contents.len()
                        );
                        let _ = socket.write_all(header.as_bytes()).await;
                        if method == "GET" {
                            let _ = socket.write_all(&contents).await;
                        }
                    }
                    Err(_) => {
                        let res = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 13\r\nCache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n404 Not Found";
                        let _ = socket.write_all(res.as_bytes()).await;
                    }
                }
            });
        }
    });

    handle_tunnel(TunnelArgs {
        port: local_port,
        provider: args.provider,
        detach: args.detach,
        qr: args.qr,
        basic_auth: args.basic_auth,
        expires: args.expires,
        force: false,
        token: None,
        workspace: None,
        relay_url: None,
        no_log: args.no_log,
        daemon_worker: false,
    }).await
}

pub(crate) fn percent_decode(input: &str) -> String {
    let mut bytes = Vec::with_capacity(input.len());
    let mut chars = input.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let h1 = chars.next();
            let h2 = chars.next();
            if let (Some(h1), Some(h2)) = (h1, h2) {
                if let Ok(val) = u8::from_str_radix(std::str::from_utf8(&[h1, h2]).unwrap_or(""), 16) {
                    bytes.push(val);
                    continue;
                }
                bytes.push(b'%');
                bytes.push(h1);
                bytes.push(h2);
            } else {
                bytes.push(b'%');
                if let Some(c) = h1 { bytes.push(c); }
            }
        } else if b == b'+' {
            bytes.push(b' ');
        } else {
            bytes.push(b);
        }
    }
    String::from_utf8_lossy(&bytes).to_string()
}
