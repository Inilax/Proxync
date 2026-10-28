use crate::args::{Provider, TunnelArgs};
use crate::ui::{
    copy_to_clipboard, format_duration_human, format_qr_code, get_standby_idle_timeout,
    open_in_browser, parse_duration_to_secs, print_hotkey_bar, print_stats, SessionStats,
};
use proxync_core::events::{create_event_channel, ProxyncEvent};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

pub async fn handle_tunnel(args: TunnelArgs) -> Result<(), Box<dyn std::error::Error>> {
    // Validate basic auth format if provided
    if let Some(ref auth) = args.basic_auth {
        if !auth.contains(':') {
            eprintln!("\x1b[1;31m[!] Error: Invalid --basic-auth format '{}'. Expected 'username:password'.\x1b[0m", auth);
            return Err("Invalid basic auth format. Format must be USER:PASS.".into());
        }
    }

    if !args.force {
        // Guard against Vite dev servers: Vite HMR WebSocket and strict Host-header checks break over public tunnels
        if let Ok(procs) = proxync_core::recon::scan_processes(false).await {
            if let Some(proc) = procs.iter().find(|p| p.port == args.port) {
                let fw = proc.framework.as_deref().unwrap_or(&proc.name).to_lowercase();
                if fw.contains("vite") {
                    eprintln!("\x1b[1;31m[!] Error: Vite dev servers are not currently supported for public tunneling.\x1b[0m");
                    eprintln!("    Support for Vite HMR and dynamic asset routing is under development.");
                    eprintln!("    Tip: Use --force to bypass this restriction if you wish to proceed anyway.");
                    return Err("Vite dev servers are not currently supported.".into());
                }
            }
        }
        // Pre-Flight Port Probe: Strict verification that a service is actually listening
        if let Ok(false) = proxync_core::recon::probe_port(args.port).await {
            eprintln!("\x1b[1;31m[!] Error: No local server detected listening on port {}.\x1b[0m", args.port);
            eprintln!("    Start your application first (e.g. `npm run dev`) before opening a public tunnel.");
            eprintln!("    Tip: Use \x1b[1m--force\x1b[0m to bypass this pre-flight check.");
            return Err("Target port is inactive.".into());
        }

        // Concurrency Guard: Block opening duplicate tunnels on the same port
        if let Some(existing) = proxync_core::registry::find_tunnel_by_port(args.port) {
            eprintln!("\x1b[1;33m[!] Warning: Port {} is already being tunneled!\x1b[0m", args.port);
            eprintln!("    Active Tunnel URL : \x1b[1;34m{}\x1b[0m", existing.public_url);
            eprintln!("    Process PID       : {}", existing.pid);
            eprintln!("    Tip: Run \x1b[1mproxync stop {}\x1b[0m to stop it, or \x1b[1m--force\x1b[0m to start anyway.", args.port);
            return Err(format!("Tunnel on port {} is already running (PID {})", args.port, existing.pid).into());
        }
    }

    // Detached Mode: Spawn an independent background worker and exit parent immediately
    if args.detach && !args.daemon_worker {
        return spawn_detached_tunnel(&args).await;
    }

    let (event_tx, mut event_rx) = create_event_channel();
    let tunnel_id = format!("tun-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_millis());
    let tunnel_id_clean = tunnel_id.clone();

    println!("\x1b[1;36m==> Starting {} tunnel for port {}...\x1b[0m", format!("{:?}", args.provider).to_lowercase(), args.port);

    // Bind local intercepting proxy so that all traffic over the public tunnel
    // is captured, measured in live stats, and streamed in real-time.
    let proxy_port = match proxync_core::proxy::start_proxy_with_auth(event_tx.clone(), args.port, args.basic_auth.clone()).await {
        Ok(p) => p,
        Err(e) if args.basic_auth.is_some() => {
            eprintln!("\x1b[1;31m[!] Error: Failed to start authenticated proxy: {}\x1b[0m", e);
            return Err("Cannot expose tunnel: basic auth proxy failed to start.".into());
        }
        Err(_) => args.port,
    };

    let public_url = match args.provider {
        Provider::Cloudflare => {
            proxync_core::tunnel::open_cloudflare_tunnel(event_tx.clone(), tunnel_id.clone(), proxy_port).await
                .map_err(|e| format!("Failed to open Cloudflare tunnel: {}", e))?
        }
        Provider::Native => {
            let sub = "auto".to_string();
            proxync_core::tunnel::open_native_tunnel(event_tx.clone(), tunnel_id.clone(), proxy_port, sub).await
                .map_err(|e| format!("Failed to open Native tunnel: {}", e))?
        }
        Provider::Relay => {
            let token = args.token.unwrap_or_else(|| "cli-token".to_string());
            let workspace = args.workspace.unwrap_or_else(|| "default".to_string());
            proxync_core::tunnel::open_tunnel(event_tx.clone(), tunnel_id.clone(), proxy_port, token, workspace, args.relay_url).await
                .map_err(|e| format!("Failed to open Relay tunnel: {}", e))?;
            format!("ws://relay/{}", tunnel_id)
        }
    };

    println!("\x1b[1;32m✓ Tunnel Established!\x1b[0m");
    println!("  Local Target : \x1b[1mhttp://localhost:{}\x1b[0m", args.port);
    println!("  Public URL   : \x1b[1;34;4m{}\x1b[0m", public_url);

    // Register active tunnel entry in persistent registry
    let started_epoch_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let is_admin = std::env::var("PROXYNC_API_SECRET_TOKEN")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .is_some();

    let effective_expires = if !is_admin {
        // Free tier: strictly limited to a maximum of 1h uptime per session
        match args.expires.as_deref() {
            None => Some("1h".to_string()),
            Some(exp_str) => {
                let requested_secs = parse_duration_to_secs(exp_str).unwrap_or(3600);
                if requested_secs > 3600 {
                    println!("\x1b[1;33m[!] Notice: Free tier sessions are capped at 1h uptime. Setting session expiration to 1h.\x1b[0m");
                    println!("    Tip: Provide admin credentials (PROXYNC_API_SECRET_TOKEN) for extended or unlimited sessions.");
                    Some("1h".to_string())
                } else {
                    Some(exp_str.to_string())
                }
            }
        }
    } else {
        // Admin tier: can run indefinitely or with custom duration
        args.expires.clone()
    };

    let expires_epoch_secs = effective_expires.as_deref().and_then(parse_duration_to_secs).map(|secs| {
        started_epoch_secs + secs
    });

    let entry = proxync_core::registry::TunnelEntry {
        id: tunnel_id.clone(),
        port: args.port,
        public_url: public_url.clone(),
        provider: format!("{:?}", args.provider).to_lowercase(),
        pid: std::process::id(),
        started_at: proxync_core::storage::get_current_iso_timestamp(),
        started_epoch_secs,
        expires_at: effective_expires.clone(),
        expires_epoch_secs,
    };
    let _ = proxync_core::registry::register_tunnel(&entry);

    if is_admin {
        println!("  Tier         : \x1b[1;35mAdmin (Unlimited Session)\x1b[0m");
    } else {
        println!("  Tier         : \x1b[1;33mFree (1h Max Session Limit)\x1b[0m");
    }

    if let Some(ref exp) = effective_expires {
        println!("  Auto-Expiry  : \x1b[1;33m{}\x1b[0m", exp);
    } else {
        println!("  Auto-Expiry  : \x1b[90mUnlimited\x1b[0m");
    }

    if args.basic_auth.is_some() {
        println!("  🔒 \x1b[33mHTTP Basic Auth: ENABLED (password protected)\x1b[0m");
    }

    if copy_to_clipboard(&public_url) {
        println!("  📋 \x1b[32mURL copied to clipboard!\x1b[0m");
    }

    if args.qr {
        if let Some(qr) = format_qr_code(&public_url) {
            println!("\n\x1b[1;36m==> Mobile QR Code for {}\x1b[0m\n{}", public_url, qr);
        }
    }

    let logging_enabled = !args.no_log;
    let show_terminal_arc = Arc::new(AtomicBool::new(!args.detach));
    let show_terminal_event = show_terminal_arc.clone();

    if logging_enabled {
        let start_msg = format!(
            "[{}] [INFO] [TUNNEL] Started {:?} tunnel for port {} -> {}",
            proxync_core::storage::get_current_iso_timestamp(),
            args.provider,
            args.port,
            public_url
        );
        let _ = proxync_core::storage::append_log_entry("cli".into(), start_msg).await;
    }

    if args.detach {
        let logs_file = proxync_core::storage::get_logs_dir().join("cli.log");
        println!("\n\x1b[1;33m[DETACHED MODE]\x1b[0m Live terminal traffic is paused.");
        println!("All session traffic is saving to: \x1b[1m{}\x1b[0m", logs_file.display());
        print_hotkey_bar(false);
    } else {
        println!("\nStreaming live HTTP traffic (Press \x1b[1mCtrl+C\x1b[0m to quit).");
        print_hotkey_bar(true);
    }

    let stats_arc = Arc::new(Mutex::new(SessionStats::default()));
    let stats_arc_event = stats_arc.clone();
    let started_at = std::time::Instant::now();

    let (hotkey_exit_tx, mut hotkey_exit_rx) = tokio::sync::mpsc::channel::<()>(1);

    // Event listener task for live request logging and tunnel liveness monitoring
    let event_tunnel_id = tunnel_id_clean.clone();
    let event_target_port = args.port;
    let event_exit_tx = hotkey_exit_tx.clone();
    let event_task = tokio::spawn(async move {
        let mut standby_reaper_cancel: Option<tokio::sync::oneshot::Sender<()>> = None;
        while let Ok(event) = event_rx.recv().await {
            match event {
                ProxyncEvent::RequestLog { id, method, path, headers, body_preview, .. } => {
                    let mut st = stats_arc_event.lock().await;
                    st.total_requests += 1;
                    drop(st);

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
                            event_target_port,
                            headers_json,
                            body_compact
                        );
                        let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                    }
                }
                ProxyncEvent::ResponseLog { status, duration_ms, .. } => {
                    let mut st = stats_arc_event.lock().await;
                    if status >= 200 && status < 300 {
                        st.success_2xx += 1;
                    } else if status >= 300 && status < 400 {
                        st.redirect_3xx += 1;
                    } else if status >= 400 && status < 500 {
                        st.client_err_4xx += 1;
                    } else if status >= 500 {
                        st.server_err_5xx += 1;
                    }
                    st.total_duration_ms += duration_ms;
                    drop(st);

                    if show_terminal_event.load(Ordering::Relaxed) {
                        let status_color = if status < 300 {
                            "\x1b[1;32m" // Green
                        } else if status < 400 {
                            "\x1b[1;36m" // Cyan
                        } else if status < 500 {
                            "\x1b[1;33m" // Yellow
                        } else {
                            "\x1b[1;31m" // Red
                        };
                        println!("    \x1b[90mstatus:\x1b[0m {}{}\x1b[0m \x1b[90m({}ms)\x1b[0m", status_color, status, duration_ms);
                    }
                    if logging_enabled {
                        let line = format!(
                            "[{}] [RES] status={} ({}ms) (port {})",
                            proxync_core::storage::get_current_iso_timestamp(),
                            status,
                            duration_ms,
                            event_target_port
                        );
                        let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                    }
                }
                ProxyncEvent::TunnelStatusChanged { port, status, .. } => {
                    if port == event_target_port {
                        if status == "STANDBY" {
                            if show_terminal_event.load(Ordering::Relaxed) {
                                println!("\n\x1b[1;33m[STANDBY]\x1b[0m Local server on port {} is offline. Waiting in standby mode...", port);
                            }
                            if logging_enabled {
                                let line = format!(
                                    "[{}] [WARN] [TUNNEL] Local server on port {} entered STANDBY mode",
                                    proxync_core::storage::get_current_iso_timestamp(),
                                    port
                                );
                                let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                            }

                            // Start standby idle reaper
                            if let Some(cancel) = standby_reaper_cancel.take() {
                                let _ = cancel.send(());
                            }
                            let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
                            standby_reaper_cancel = Some(cancel_tx);
                            let exit_tx_reaper = event_exit_tx.clone();
                            let reaper_port = port;
                            let idle_timeout = get_standby_idle_timeout();

                            tokio::spawn(async move {
                                tokio::select! {
                                    _ = tokio::time::sleep(idle_timeout) => {
                                        let duration_human = format_duration_human(idle_timeout.as_secs());
                                        println!("\n\x1b[1;33m[!] Inactive tunnel auto-closed (local server on port {} remained offline for {}).\x1b[0m", reaper_port, duration_human);
                                        let msg = format!(
                                            "[{}] [WARN] [TUNNEL] Tunnel on port {} automatically closed after {} of continuous standby inactivity",
                                            proxync_core::storage::get_current_iso_timestamp(),
                                            reaper_port,
                                            duration_human
                                        );
                                        let _ = proxync_core::storage::append_log_entry("cli".into(), msg).await;
                                        let _ = exit_tx_reaper.send(()).await;
                                    }
                                    _ = &mut cancel_rx => {
                                        // Cancelled: local service returned to active
                                    }
                                }
                            });
                        } else if status == "ACTIVE" {
                            // Cancel active standby idle reaper
                            if let Some(cancel) = standby_reaper_cancel.take() {
                                let _ = cancel.send(());
                            }

                            if show_terminal_event.load(Ordering::Relaxed) {
                                println!("\x1b[1;32m[ACTIVE]\x1b[0m Local server on port {} is back online! Resuming live traffic forwarding.", port);
                            }
                            if logging_enabled {
                                let line = format!(
                                    "[{}] [INFO] [TUNNEL] Local server on port {} resumed ACTIVE mode",
                                    proxync_core::storage::get_current_iso_timestamp(),
                                    port
                                );
                                let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                            }
                        }
                    }
                }
                ProxyncEvent::TunnelAutoClosed { tunnel_id: closed_id } => {
                    if closed_id == event_tunnel_id {
                        println!("\x1b[31m[!] Tunnel process terminated.\x1b[0m");
                        if logging_enabled {
                            let line = format!(
                                "[{}] [WARN] [TUNNEL] Tunnel terminated (id: {})",
                                proxync_core::storage::get_current_iso_timestamp(),
                                closed_id
                            );
                            let _ = proxync_core::storage::append_log_entry("cli".into(), line).await;
                        }
                        break;
                    }
                }
            }
        }
    });

    if !args.daemon_worker {
        let hotkey_url = public_url.clone();
        let stats_for_hotkey = stats_arc.clone();
        let show_terminal_hotkey = show_terminal_arc.clone();
        let hotkey_tx_for_thread = hotkey_exit_tx.clone();
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
                                    let _ = hotkey_tx_for_thread.blocking_send(());
                                    break;
                                }
                                crossterm::event::KeyCode::Esc => {
                                    let _ = hotkey_tx_for_thread.blocking_send(());
                                    break;
                                }
                                crossterm::event::KeyCode::Char('o') | crossterm::event::KeyCode::Char('O') => {
                                    open_in_browser(&hotkey_url);
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                                }
                                crossterm::event::KeyCode::Char('c') | crossterm::event::KeyCode::Char('C') => {
                                    if copy_to_clipboard(&hotkey_url) {
                                        println!("\x1b[1;32m📋 Copied URL to clipboard: {}\x1b[0m", hotkey_url);
                                    }
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                                }
                                crossterm::event::KeyCode::Char('q') | crossterm::event::KeyCode::Char('Q') => {
                                    if let Some(qr) = format_qr_code(&hotkey_url) {
                                        println!("\n\x1b[1;36m==> Mobile QR Code for {}\x1b[0m\n{}", hotkey_url, qr);
                                    }
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                                }
                                crossterm::event::KeyCode::Char('s') | crossterm::event::KeyCode::Char('S') => {
                                    print_stats(&stats_for_hotkey, started_at);
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
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
                                    print_hotkey_bar(next);
                                }
                                crossterm::event::KeyCode::Char('l') | crossterm::event::KeyCode::Char('L') => {
                                    print!("\x1b[2J\x1b[1;1H");
                                    println!("\x1b[1;32m✓ Tunnel Active: \x1b[1;34;4m{}\x1b[0m", hotkey_url);
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                                }
                                crossterm::event::KeyCode::Char('h') | crossterm::event::KeyCode::Char('H') | crossterm::event::KeyCode::Char('?') => {
                                    print_hotkey_bar(show_terminal_hotkey.load(Ordering::Relaxed));
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        });
    }

    if let Some(exp_secs) = expires_epoch_secs {
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let diff = exp_secs.saturating_sub(now_secs);
        let hotkey_tx_clone = hotkey_exit_tx.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(diff)).await;
            if logging_enabled {
                let _ = proxync_core::storage::append_log_entry("cli".into(), format!(
                    "[{}] [INFO] [TUNNEL] Session auto-expired ({}s limit reached)",
                    proxync_core::storage::get_current_iso_timestamp(),
                    diff
                )).await;
            }
            let _ = hotkey_tx_clone.send(()).await;
        });
    }

    let _keep_exit_tx = hotkey_exit_tx;
    if args.daemon_worker {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {}
            Some(()) = hotkey_exit_rx.recv() => {}
            _ = event_task => {}
        }
    } else {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {
                println!("\n\x1b[33m==> Closing tunnel...\x1b[0m");
            }
            Some(()) = hotkey_exit_rx.recv() => {
                println!("\n\x1b[33m==> Closing tunnel...\x1b[0m");
            }
            _ = event_task => {}
        }
    }

    let _ = proxync_core::registry::unregister_tunnel(&tunnel_id_clean);
    let _ = proxync_core::tunnel::close_tunnel(tunnel_id, Some(args.port)).await;
    let _ = proxync_core::proxy::stop_proxy(Some(args.port)).await;
    if logging_enabled {
        let close_msg = format!(
            "[{}] [INFO] [TUNNEL] Closed tunnel for port {}",
            proxync_core::storage::get_current_iso_timestamp(),
            args.port
        );
        let _ = proxync_core::storage::append_log_entry("cli".into(), close_msg).await;
    }
    println!("\x1b[1;32m✓ Tunnel closed cleanly.\x1b[0m");

    Ok(())
}

pub async fn spawn_detached_tunnel(args: &TunnelArgs) -> Result<(), Box<dyn std::error::Error>> {
    let current_exe = std::env::current_exe()?;
    let mut cmd = Command::new(&current_exe);

    cmd.arg("tunnel")
       .arg(args.port.to_string())
       .arg("--detach")
       .arg("--daemon-worker")
       .arg("--force");

    cmd.arg("--provider").arg(format!("{:?}", args.provider).to_lowercase());

    if let Some(ref auth) = args.basic_auth {
        cmd.env("PROXYNC_BASIC_AUTH", auth);
    }
    let is_admin = std::env::var("PROXYNC_API_SECRET_TOKEN")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .is_some();
    let effective_expires = if !is_admin {
        match args.expires.as_deref() {
            None => "1h".to_string(),
            Some(exp_str) => {
                let requested_secs = parse_duration_to_secs(exp_str).unwrap_or(3600);
                if requested_secs > 3600 { "1h".to_string() } else { exp_str.to_string() }
            }
        }
    } else {
        args.expires.clone().unwrap_or_else(|| "1h".to_string())
    };
    cmd.arg("--expires").arg(&effective_expires);
    if args.qr {
        cmd.arg("--qr");
    }
    if args.no_log {
        cmd.arg("--no-log");
    }
    if let Some(ref tok) = args.token {
        cmd.arg("--token").arg(tok);
    }
    if let Some(ref ws) = args.workspace {
        cmd.arg("--workspace").arg(ws);
    }
    if let Some(ref r_url) = args.relay_url {
        cmd.arg("--relay-url").arg(r_url);
    }

    let daemon_log_path = proxync_core::storage::get_logs_dir().join("daemon.log");
    if let Some(parent) = daemon_log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let daemon_log_file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(&daemon_log_path)?;
    let daemon_err_file = daemon_log_file.try_clone()?;

    cmd.stdin(std::process::Stdio::null())
       .stdout(daemon_log_file)
       .stderr(daemon_err_file);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // Try CREATE_BREAKAWAY_FROM_JOB (0x01000000) so daemon worker survives parent terminal/job teardown
        cmd.creation_flags(0x08000000 | 0x00000200 | 0x01000000);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        // Detach child from controlling terminal process group so it survives terminal closure
        cmd.process_group(0);
    }

    let child = match cmd.spawn() {
        Ok(c) => c,
        Err(_) => {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000 | 0x00000200);
            }
            cmd.spawn().map_err(|e| format!("Failed to spawn background tunnel worker: {}", e))?
        }
    };
    let child_pid = child.id();

    println!("\x1b[1;36m==> Starting background {} tunnel for port {}...\x1b[0m", format!("{:?}", args.provider).to_lowercase(), args.port);

    // Poll registry until background worker has registered the live tunnel
    let mut registered_entry = None;
    for _ in 0..60 {
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        if let Some(entry) = proxync_core::registry::find_tunnel_by_port(args.port) {
            if entry.pid == child_pid {
                registered_entry = Some(entry);
                break;
            }
        }
        if !proxync_core::registry::is_process_alive(child_pid) {
            break;
        }
    }

    if let Some(entry) = registered_entry {
        println!("\x1b[1;32m✓ Tunnel started in background (PID: {})\x1b[0m", child_pid);
        println!("  Local Target : \x1b[1mhttp://localhost:{}\x1b[0m", args.port);
        println!("  Public URL   : \x1b[1;34;4m{}\x1b[0m", entry.public_url);
        if let Some(ref exp) = entry.expires_at {
            println!("  Auto-Expiry  : {} (Stop anytime with: \x1b[1mproxync stop {}\x1b[0m)", exp, args.port);
        }
        if args.basic_auth.is_some() {
            println!("  🔒 \x1b[33mHTTP Basic Auth: ENABLED (password protected)\x1b[0m");
        }
        if copy_to_clipboard(&entry.public_url) {
            println!("  📋 \x1b[32mURL copied to clipboard!\x1b[0m");
        }
        if args.qr {
            if let Some(qr) = format_qr_code(&entry.public_url) {
                println!("\n\x1b[1;36m==> Mobile QR Code for {}\x1b[0m\n{}", entry.public_url, qr);
            }
        }
        let logs_file = proxync_core::storage::get_logs_dir().join("cli.log");
        println!("  CLI Logs     : \x1b[90m{}\x1b[0m", logs_file.display());
        println!("\nTip: Run \x1b[1mproxync ps\x1b[0m to list running tunnels, or \x1b[1mproxync open {}\x1b[0m to open in browser.", args.port);
        Ok(())
    } else {
        eprintln!("\x1b[1;31m[!] Error: Background worker (PID {}) failed to establish tunnel within timeout.\x1b[0m", child_pid);
        eprintln!("    Check CLI logs for details: \x1b[1mproxync logs --lines 20\x1b[0m");
        Err("Background worker failed to register tunnel.".into())
    }
}
