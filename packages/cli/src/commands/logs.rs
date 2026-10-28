use crate::args::{LogsArgs, ReplayArgs};
use crate::ui::print_colored_log_line;
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Clone, PartialEq)]
pub struct LoggedRequest {
    pub id: String,
    pub method: String,
    pub path: String,
    pub port: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

pub fn parse_logged_request(line: &str) -> Option<LoggedRequest> {
    if !line.contains("[REQ]") {
        return None;
    }

    let req_idx = line.find("[REQ]")?;
    let after_req = line[req_idx + 5..].trim_start();

    // Extract method & path:
    let mut tokens = after_req.split_whitespace();
    let method = tokens.next()?.to_string();
    let raw_path = tokens.next()?.to_string();
    let path = if raw_path.starts_with('/') {
        raw_path
    } else {
        format!("/{}", raw_path)
    };

    // Extract id:
    let id = if let Some(pos) = line.find("(id: ") {
        let rem = &line[pos + 5..];
        let end = rem.find(')')?;
        rem[..end].trim().to_string()
    } else if let Some(pos) = line.find("id=") {
        let rem = &line[pos + 3..];
        let end = rem.find(' ').unwrap_or(rem.len());
        rem[..end].trim().to_string()
    } else {
        "unknown".to_string()
    };

    // Extract port:
    let port = if let Some(pos) = line.find("(port ") {
        let rem = &line[pos + 6..];
        let end = rem.find(')')?;
        rem[..end].trim().parse::<u16>().ok()?
    } else if let Some(pos) = line.find("port=") {
        let rem = &line[pos + 5..];
        let end = rem.find(' ').unwrap_or(rem.len());
        rem[..end].trim().parse::<u16>().ok()?
    } else {
        3000
    };

    // Extract headers and body safely using serde_json Deserializer
    let (headers, body) = if let Some(pos) = line.find("headers=") {
        let rem = &line[pos + 8..];
        let mut stream = serde_json::Deserializer::from_str(rem)
            .into_iter::<HashMap<String, String>>();
        let parsed_headers = stream.next().and_then(|r| r.ok()).unwrap_or_default();
        let offset = stream.byte_offset();
        let after_headers = &rem[offset..];
        let parsed_body = if let Some(b_pos) = after_headers.find("body=") {
            after_headers[b_pos + 5..].trim_start().replace("\\n", "\n").replace("\\r", "\r")
        } else {
            String::new()
        };
        (parsed_headers, parsed_body)
    } else {
        let body = if let Some(pos) = line.find(" body=") {
            line[pos + 6..].replace("\\n", "\n").replace("\\r", "\r")
        } else {
            String::new()
        };
        (HashMap::new(), body)
    };

    Some(LoggedRequest {
        id,
        method,
        path,
        port,
        headers,
        body,
    })
}

pub async fn handle_logs(args: LogsArgs) -> Result<(), Box<dyn std::error::Error>> {
    let logs_dir = proxync_core::storage::get_logs_dir();
    let cli_log_path = logs_dir.join("cli.log");

    if args.clear {
        let _ = std::fs::write(&cli_log_path, "");
        let _ = std::fs::remove_file(logs_dir.join("cli.log.old"));
        println!("\x1b[1;32m✓ CLI logs cleared successfully.\x1b[0m");
        return Ok(());
    }

    if !cli_log_path.exists() {
        println!("\x1b[33mNo CLI logs recorded yet at {}\x1b[0m", cli_log_path.display());
        return Ok(());
    }

    let content = std::fs::read_to_string(&cli_log_path)?;
    let all_lines: Vec<&str> = if let Some(ref pat) = args.grep {
        let pat_lower = pat.to_lowercase();
        content.lines().filter(|l| l.to_lowercase().contains(&pat_lower)).collect()
    } else {
        content.lines().collect()
    };

    if all_lines.is_empty() {
        if let Some(ref pat) = args.grep {
            println!("\x1b[33mNo log lines matched pattern '{}'\x1b[0m", pat);
        } else {
            println!("\x1b[33mCLI log file is empty ({})\x1b[0m", cli_log_path.display());
        }
        if !args.follow {
            return Ok(());
        }
    } else {
        let start_idx = all_lines.len().saturating_sub(args.lines);
        let header_suffix = if let Some(ref pat) = args.grep {
            format!(" matching '{}'", pat)
        } else {
            String::new()
        };
        println!("\x1b[1;36m==> Showing last {} lines of {}{}\x1b[0m\n", all_lines.len() - start_idx, cli_log_path.display(), header_suffix);
        for line in &all_lines[start_idx..] {
            print_colored_log_line(line);
        }
    }

    if args.follow {
        println!("\n\x1b[90mStreaming live updates (Press Ctrl+C to quit)...\x1b[0m\n");
        let mut last_size = std::fs::metadata(&cli_log_path).map(|m| m.len()).unwrap_or(0);
        loop {
            tokio::select! {
                _ = tokio::signal::ctrl_c() => {
                    println!("\n\x1b[33m==> Stopped streaming logs.\x1b[0m");
                    return Ok(());
                }
                _ = tokio::time::sleep(std::time::Duration::from_millis(250)) => {}
            }
            if let Ok(meta) = std::fs::metadata(&cli_log_path) {
                let current_size = meta.len();
                if current_size > last_size {
                    use std::io::{Read, Seek, SeekFrom};
                    if let Ok(mut file) = std::fs::File::open(&cli_log_path) {
                        if file.seek(SeekFrom::Start(last_size)).is_ok() {
                            let to_read = (current_size - last_size) as usize;
                            let mut buf = vec![0u8; to_read];
                            if let Ok(n) = file.read(&mut buf) {
                                if n > 0 {
                                    if let Some(last_nl) = buf[..n].iter().rposition(|&b| b == b'\n') {
                                        let valid_chunk = String::from_utf8_lossy(&buf[..last_nl]);
                                        for line in valid_chunk.lines() {
                                            let matches = match args.grep {
                                                Some(ref pat) => line.to_lowercase().contains(&pat.to_lowercase()),
                                                None => true,
                                            };
                                            if matches {
                                                print_colored_log_line(line);
                                            }
                                        }
                                        last_size += (last_nl + 1) as u64;
                                    }
                                }
                            }
                        }
                    }
                } else if current_size < last_size {
                    last_size = 0;
                }
            }
        }
    }

    Ok(())
}

pub async fn handle_replay(args: ReplayArgs) -> Result<(), Box<dyn std::error::Error>> {
    let logs_dir = proxync_core::storage::get_logs_dir();
    let cli_log_path = logs_dir.join("cli.log");
    if !cli_log_path.exists() {
        eprintln!("\x1b[1;33m[!] No CLI session logs found to replay.\x1b[0m");
        eprintln!("    Run a tunnel or inspector first to capture incoming requests.");
        return Ok(());
    }

    let content = std::fs::read_to_string(&cli_log_path)?;
    let req_id = args.id.trim();

    // Search in reverse for the target request ID with boundary precision
    let target_line = content.lines().rev().find(|l| {
        if !l.contains("[REQ]") {
            return false;
        }
        if let Some(pos) = l.find("(id: ") {
            if let Some(end) = l[pos + 5..].find(')') {
                let id_in_line = &l[pos + 5..pos + 5 + end];
                if id_in_line.eq_ignore_ascii_case(req_id) || id_in_line.contains(req_id) {
                    return true;
                }
            }
        }
        if let Some(pos) = l.find("id=") {
            let rem = &l[pos + 3..];
            let end = rem.find(' ').unwrap_or(rem.len());
            let id_in_line = &rem[..end];
            if id_in_line.eq_ignore_ascii_case(req_id) || id_in_line.contains(req_id) {
                return true;
            }
        }
        false
    });

    let logged_req = match target_line.and_then(parse_logged_request) {
        Some(req) => req,
        None => {
            eprintln!("\x1b[1;33m[!] Request ID '{}' not found in session logs.\x1b[0m", req_id);
            // Extract recent captured request IDs to help developer
            let recent: Vec<_> = content.lines().rev()
                .filter_map(parse_logged_request)
                .take(5)
                .collect();
            if !recent.is_empty() {
                println!("\nRecent captured requests:");
                for r in recent {
                    println!("  • \x1b[1m{}\x1b[0m — {:<6} {} (port {})", r.id, r.method, r.path, r.port);
                }
                println!("\nTip: Replay with \x1b[1mproxync replay <id>\x1b[0m");
            }
            return Ok(());
        }
    };

    let effective_port = args.port.unwrap_or(logged_req.port);
    let target_url = format!("http://127.0.0.1:{}{}", effective_port, logged_req.path);

    println!("\x1b[1;36m==> Replaying request {} against {}...\x1b[0m", logged_req.id, target_url);
    println!("    Method : \x1b[1m{}\x1b[0m", logged_req.method);
    println!("    Path   : {}", logged_req.path);
    println!("    Target : http://localhost:{}", effective_port);

    // Filter out [REDACTED] or forbidden headers (host, content-length are handled by reqwest)
    let mut replay_headers = logged_req.headers.clone();
    replay_headers.retain(|k, v| {
        let k_lower = k.to_lowercase();
        if v.contains("[REDACTED]") {
            println!("    \x1b[33m[!] Header '{}' was redacted during capture and skipped.\x1b[0m", k);
            false
        } else if k_lower == "host" || k_lower == "content-length" {
            false
        } else {
            true
        }
    });

    println!("    Headers: {} replayed", replay_headers.len());
    if !logged_req.body.is_empty() {
        println!("    Body   : {} bytes", logged_req.body.len());
    }

    let start = Instant::now();
    let body_opt = if logged_req.body.is_empty() { None } else { Some(logged_req.body.clone()) };

    match proxync_core::http::execute_http_request(
        logged_req.method.clone(),
        target_url.clone(),
        replay_headers,
        body_opt,
    ).await {
        Ok(resp) => {
            let elapsed = start.elapsed().as_millis();
            let status_color = if resp.status < 300 {
                "\x1b[1;32m"
            } else if resp.status < 400 {
                "\x1b[1;36m"
            } else if resp.status < 500 {
                "\x1b[1;33m"
            } else {
                "\x1b[1;31m"
            };

            println!("\n\x1b[1mReplay Result:\x1b[0m");
            println!("  Status   : {}{}\x1b[0m ({}ms)", status_color, resp.status, elapsed);
            println!("  Headers  : {} returned", resp.headers.len());
            println!("  Body Size: {} bytes", resp.body.len());

            if !resp.body.is_empty() {
                println!("\n\x1b[1mResponse Body:\x1b[0m");
                let char_count = resp.body.chars().count();
                if char_count > 800 {
                    let preview: String = resp.body.chars().take(800).collect();
                    println!("{}", preview);
                    println!("\x1b[90m... ({} chars truncated)\x1b[0m", char_count - 800);
                } else {
                    println!("{}", resp.body);
                }
            }

            // Log replay execution to cli.log
            let replay_log = format!(
                "[{}] [INFO] [REPLAY] Replayed req {} -> {} status={} ({}ms)",
                proxync_core::storage::get_current_iso_timestamp(),
                logged_req.id,
                target_url,
                resp.status,
                elapsed
            );
            let _ = proxync_core::storage::append_log_entry("cli".into(), replay_log).await;
        }
        Err(e) => {
            eprintln!("\n\x1b[1;31m[!] Replay failed: {}\x1b[0m", e);
            eprintln!("    Make sure your local server is running on port {}.", effective_port);
        }
    }

    Ok(())
}
