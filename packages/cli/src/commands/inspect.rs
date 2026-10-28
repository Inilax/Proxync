use crate::args::ProxyArgs;
use crate::ui::{contains_discrete_port, is_tunnel_closure_log_line, print_colored_log_line, print_proxy_hotkey_bar};
use proxync_core::events::{create_event_channel, ProxyncEvent};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub async fn handle_proxy(args: ProxyArgs) -> Result<(), Box<dyn std::error::Error>> {
    // If a tunnel is already running for this port, attach to it instead of failing or creating a second tunnel!
    if let Some(existing) = proxync_core::registry::find_tunnel_by_port(args.port) {
        println!("\x1b[1;36m==> Attaching live traffic inspector for port {}...\x1b[0m", args.port);
        println!("    Active Tunnel : \x1b[1;34m{}\x1b[0m", existing.public_url);
        println!("    Process PID   : {}", existing.pid);
        println!("    Mode          : \x1b[1;32mATTACHED\x1b[0m (listening to session traffic, no duplicate tunnel created)");
        return tail_traffic_stream(args.port).await;
    }

    let (event_tx, mut event_rx) = create_event_channel();

    println!("\x1b[1;36m==> Starting traffic interception on port {}...\x1b[0m", args.port);

    let proxy_port = proxync_core::proxy::start_proxy(event_tx, args.port)
        .await
        .map_err(|e| format!("Failed to start interceptor proxy: {}", e))?;

    let show_terminal_arc = Arc::new(AtomicBool::new(!args.detach));
    let show_terminal_event = show_terminal_arc.clone();
    let logging_enabled = !args.no_log;

    if args.detach {
        let logs_file = proxync_core::storage::get_logs_dir().join("cli.log");
        println!("\x1b[1;32m✓ Local interceptor running on port {}\x1b[0m (targeting localhost:{})", proxy_port, args.port);
        println!("\x1b[1;33m[DETACHED MODE]\x1b[0m Live terminal traffic is paused.");
        println!("All session traffic is saving to: \x1b[1m{}\x1b[0m", logs_file.display());
        print_proxy_hotkey_bar(false);
    } else {
        println!("\x1b[1;32m✓ Intercepting proxy running on http://127.0.0.1:{}\x1b[0m (forwarding to port {})", proxy_port, args.port);
        println!("Configure your client or webhook to hit this URL to inspect traffic.\n");
        println!("Streaming live HTTP traffic (Press \x1b[1mCtrl+C\x1b[0m to quit).");
        print_proxy_hotkey_bar(true);
    }

    let target_port = args.port;
    // Event listener task
    let event_task = tokio::spawn(async move {
        while let Ok(event) = event_rx.recv().await {
            match event {
                ProxyncEvent::RequestLog { id, method, path, headers, body_preview, .. } => {
                    if show_terminal_event.load(Ordering::Relaxed) {
                        println!("\x1b[1;33m--> {:<6}\x1b[0m {} \x1b[90m(id: {})\x1b[0m", method, path, id);
                    }
                    if logging_enabled {
                        let headers_json = serde_json::to_string(&headers).unwrap_or_else(|_| "{}".to_string()).replace('\n', " ");
                        let body_compact = body_preview.replace('\n', "\\n").replace('\r', "\\r");
                        let line = format!(
                            "[{}] [REQ] {:<6} {} (id: {}) (port {}) headers={} body={}",
                            proxync_core::storage::get_current_iso_timestamp(),
                            method,
                            path,
                            id,
                            target_port,
                            headers_json,
                            body_compact
                        );
                        let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                    }
                }
                ProxyncEvent::ResponseLog { status, duration_ms, .. } => {
                    if show_terminal_event.load(Ordering::Relaxed) {
                        let status_color = if status < 300 {
                            "\x1b[1;32m"
                        } else if status < 400 {
                            "\x1b[1;36m"
                        } else if status < 500 {
                            "\x1b[1;33m"
                        } else {
                            "\x1b[1;31m"
                        };
                        println!("    \x1b[90mstatus:\x1b[0m {}{}\x1b[0m \x1b[90m({}ms)\x1b[0m", status_color, status, duration_ms);
                    }
                    if logging_enabled {
                        let line = format!(
                            "[{}] [RES] status={} ({}ms) (port {})",
                            proxync_core::storage::get_current_iso_timestamp(),
                            status,
                            duration_ms,
                            target_port
                        );
                        let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                    }
                }
                _ => {}
            }
        }
    });

    let (exit_tx, mut exit_rx) = tokio::sync::mpsc::channel::<()>(1);
    let show_terminal_hotkey = show_terminal_arc.clone();
    let hotkey_tx = exit_tx.clone();
    tokio::task::spawn_blocking(move || {
        let _raw_guard = crate::ui::RawModeGuard::new();
        if !_raw_guard.is_active() {
            return;
        }
        loop {
            if crossterm::event::poll(std::time::Duration::from_millis(150)).unwrap_or(false) {
                if let Ok(crossterm::event::Event::Key(key)) = crossterm::event::read() {
                    if key.kind == crossterm::event::KeyEventKind::Press || key.kind == crossterm::event::KeyEventKind::Repeat {
                        match key.code {
                            crossterm::event::KeyCode::Char('c') if key.modifiers.contains(crossterm::event::KeyModifiers::CONTROL) => {
                                let _ = hotkey_tx.blocking_send(());
                                break;
                            }
                            crossterm::event::KeyCode::Esc => {
                                let _ = hotkey_tx.blocking_send(());
                                break;
                            }
                            crossterm::event::KeyCode::Char('t') | crossterm::event::KeyCode::Char('T') => {
                                let cur = show_terminal_hotkey.load(Ordering::Relaxed);
                                let next = !cur;
                                show_terminal_hotkey.store(next, Ordering::Relaxed);
                                if next {
                                    println!("\x1b[1;32m🔊 Live traffic streaming resumed.\x1b[0m");
                                } else {
                                    println!("\x1b[1;33m🔇 Live traffic streaming paused (requests still logged to cli.log).\x1b[0m");
                                }
                                print_proxy_hotkey_bar(next);
                            }
                            crossterm::event::KeyCode::Char('l') | crossterm::event::KeyCode::Char('L') => {
                                print!("\x1b[2J\x1b[1;1H");
                                println!("\x1b[1;32m✓ Intercepting Proxy Active (Target: localhost:{})\x1b[0m", target_port);
                                print_proxy_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            println!("\n\x1b[33m==> Stopping proxy interceptor...\x1b[0m");
        }
        Some(()) = exit_rx.recv() => {
            println!("\n\x1b[33m==> Stopping proxy interceptor...\x1b[0m");
        }
        _ = event_task => {}
    }

    let _ = proxync_core::proxy::stop_proxy(Some(args.port)).await;
    println!("\x1b[1;32m✓ Interceptor stopped cleanly.\x1b[0m");

    Ok(())
}

pub async fn tail_traffic_stream(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let logs_dir = proxync_core::storage::get_logs_dir();
    let cli_log_path = logs_dir.join("cli.log");
    println!("\x1b[90mStreaming live requests for port {} (Press Ctrl+C to detach)...\x1b[0m\n", port);

    let port_str = port.to_string();
    let mut last_size = std::fs::metadata(&cli_log_path).map(|m| m.len()).unwrap_or(0);
    let mut check_counter: u32 = 0;

    loop {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {
                println!("\n\x1b[33m==> Detaching inspector...\x1b[0m");
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
                                        let matches_port = line.contains(&format!("(port {})", port_str)) 
                                            || contains_discrete_port(line, port)
                                            || (!line.contains("(port ") && (line.contains("[REQ]") || line.contains("[RES]")));
                                        if matches_port {
                                            print_colored_log_line(line);
                                        }

                                        if is_tunnel_closure_log_line(line, port) {
                                            println!("\n\x1b[32m✓ Tunnel on port {} was closed. Detaching inspector.\x1b[0m", port);
                                            return Ok(());
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

        // Periodic heartbeat check: verify target tunnel is still registered & alive
        check_counter = check_counter.wrapping_add(1);
        if check_counter % 4 == 0 { // Every ~1s
            match proxync_core::registry::find_tunnel_by_port(port) {
                Some(entry) => {
                    if !proxync_core::registry::is_process_alive(entry.pid) {
                        println!("\n\x1b[33m[!] Tunnel process (PID {}) for port {} has exited. Detaching inspector.\x1b[0m", entry.pid, port);
                        return Ok(());
                    }
                }
                None => {
                    println!("\n\x1b[32m✓ Tunnel on port {} is no longer running. Detaching inspector.\x1b[0m", port);
                    return Ok(());
                }
            }
        }
    }
}
