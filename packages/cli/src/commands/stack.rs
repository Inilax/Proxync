use crate::args::{Provider, StackArgs};
use crate::ui::{
    parse_duration_to_secs, print_hotkey_bar, SessionStats,
};
use proxync_core::events::{create_event_channel, ProxyncEvent};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackServiceConfig {
    pub name: String,
    pub port: u16,
    pub basic_auth: Option<String>,
}

#[derive(Debug, Clone)]
struct ActiveService {
    name: String,
    port: u16,
    tunnel_id: String,
    public_url: String,
    _proxy_port: u16,
}

pub async fn handle_stack(args: StackArgs) -> Result<(), Box<dyn std::error::Error>> {
    // ── 1. Resolve Stack Services ────────────────────────────────────────────
    let mut services: Vec<StackServiceConfig> = Vec::new();

    if !args.services.is_empty() {
        for s in &args.services {
            if let Some((name, port_str)) = s.split_once(':') {
                let port: u16 = port_str.trim().parse()
                    .map_err(|_| format!("Invalid port in service '{}': '{}' is not a number", s, port_str))?;
                services.push(StackServiceConfig {
                    name: name.trim().to_string(),
                    port,
                    basic_auth: args.basic_auth.clone(),
                });
            } else if let Ok(port) = s.parse::<u16>() {
                services.push(StackServiceConfig {
                    name: format!("srv-{}", port),
                    port,
                    basic_auth: args.basic_auth.clone(),
                });
            } else {
                return Err(format!("Invalid service argument '{}'. Expected PORT (e.g. 3000) or NAME:PORT (e.g. web:3000)", s).into());
            }
        }
    } else {
        // Try reading config file
        let config_path = args.config.as_deref().unwrap_or("proxync.json");
        let alt_config_path = ".proxync.json";

        let path_to_read = if std::path::Path::new(config_path).exists() {
            Some(config_path)
        } else if std::path::Path::new(alt_config_path).exists() {
            Some(alt_config_path)
        } else {
            None
        };

        if let Some(p) = path_to_read {
            let content = std::fs::read_to_string(p)?;
            println!("\x1b[90mLoaded stack configuration from {}\x1b[0m", p);
            // Flexible JSON parser: supports {"services": [...]}, [{...}], or {"web": 3000}
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = val.get("services").and_then(|v| v.as_array()) {
                    for item in arr {
                        if let (Some(name), Some(port)) = (item.get("name").and_then(|v| v.as_str()), item.get("port").and_then(|v| v.as_u64())) {
                            let auth = item.get("basic_auth").and_then(|v| v.as_str()).map(|s| s.to_string()).or_else(|| args.basic_auth.clone());
                            services.push(StackServiceConfig { name: name.to_string(), port: port as u16, basic_auth: auth });
                        }
                    }
                } else if let Some(arr) = val.as_array() {
                    for item in arr {
                        if let (Some(name), Some(port)) = (item.get("name").and_then(|v| v.as_str()), item.get("port").and_then(|v| v.as_u64())) {
                            let auth = item.get("basic_auth").and_then(|v| v.as_str()).map(|s| s.to_string()).or_else(|| args.basic_auth.clone());
                            services.push(StackServiceConfig { name: name.to_string(), port: port as u16, basic_auth: auth });
                        }
                    }
                } else if let Some(map) = val.as_object() {
                    for (k, v) in map {
                        if let Some(port) = v.as_u64() {
                            services.push(StackServiceConfig { name: k.clone(), port: port as u16, basic_auth: args.basic_auth.clone() });
                        }
                    }
                }
            }
        }

        // If still empty, perform auto-recon scan
        if services.is_empty() {
            println!("\x1b[90mScanning for running development servers on this machine...\x1b[0m");
            if let Ok(procs) = proxync_core::recon::scan_processes(false).await {
                let dev_procs: Vec<_> = procs.into_iter()
                    .filter(|p| proxync_core::recon::is_dev_port(p.port))
                    .collect();

                if dev_procs.len() >= 2 {
                    println!("\x1b[1;36m✨ Discovered active microservice stack on your machine:\x1b[0m");
                    for p in &dev_procs {
                        let label = p.framework.as_deref().unwrap_or(&p.name);
                        println!("   • \x1b[1m{:<16}\x1b[0m on port \x1b[33m{}\x1b[0m", label, p.port);
                        services.push(StackServiceConfig {
                            name: label.to_lowercase().replace(' ', "-"),
                            port: p.port,
                            basic_auth: args.basic_auth.clone(),
                        });
                    }
                    println!();
                } else if dev_procs.len() == 1 {
                    let p = &dev_procs[0];
                    let label = p.framework.as_deref().unwrap_or(&p.name);
                    println!("\x1b[33m[!] Only 1 server detected ({} on port {}).\x1b[0m", label, p.port);
                    println!("    For a single server, run: \x1b[1mproxync {}\x1b[0m", p.port);
                    println!("    To expose multiple services, run: \x1b[1mproxync stack 3000 8080\x1b[0m\n");
                    services.push(StackServiceConfig {
                        name: label.to_lowercase().replace(' ', "-"),
                        port: p.port,
                        basic_auth: args.basic_auth.clone(),
                    });
                }
            }
        }
    }

    if services.is_empty() {
        eprintln!("\x1b[1;31m[!] Error: No services specified and no running dev servers discovered.\x1b[0m");
        eprintln!("    Usage: \x1b[1mproxync stack 3000 8080\x1b[0m");
        eprintln!("    Or with labels: \x1b[1mproxync stack web:3000 api:8080\x1b[0m");
        eprintln!("    Or define a \x1b[1mproxync.json\x1b[0m in your monorepo root.");
        return Err("No stack services to tunnel.".into());
    }

    // ── 2. Check for port collisions within the stack ────────────────────────
    let mut seen_ports = std::collections::HashSet::new();
    for s in &services {
        if !seen_ports.insert(s.port) {
            eprintln!("\x1b[1;31m[!] Error: Duplicate port {} in stack specification.\x1b[0m", s.port);
            return Err("Duplicate port in stack.".into());
        }
    }

    // ── 3. Pre-flight verification for all services ─────────────────────────
    if !args.force {
        for s in &services {
            if let Ok(false) = proxync_core::recon::probe_port(s.port).await {
                eprintln!("\x1b[1;31m[!] Error: Local service '{}' on port {} is inactive.\x1b[0m", s.name, s.port);
                eprintln!("    Start the server first (e.g. `npm run dev`), or use \x1b[1m--force\x1b[0m to bypass.");
                return Err(format!("Service '{}' on port {} is inactive.", s.name, s.port).into());
            }

            if let Some(existing) = proxync_core::registry::find_tunnel_by_port(s.port) {
                eprintln!("\x1b[1;33m[!] Warning: Port {} is already being tunneled (PID {})!\x1b[0m", s.port, existing.pid);
                eprintln!("    Active Tunnel URL : \x1b[1;34m{}\x1b[0m", existing.public_url);
                eprintln!("    Tip: Run \x1b[1mproxync stop {}\x1b[0m before starting the stack, or use \x1b[1m--force\x1b[0m.", s.port);
                return Err(format!("Port {} is already tunneled.", s.port).into());
            }
        }
    }

    println!("\x1b[1;36m==> Launching Proxync Stack ({} services via {:?})...\x1b[0m", services.len(), args.provider);

    let (event_tx, mut event_rx) = create_event_channel();
    let started_epoch_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let is_admin = std::env::var("PROXYNC_API_SECRET_TOKEN")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .is_some();

    let effective_expires = if !is_admin {
        match args.expires.as_deref() {
            None => Some("1h".to_string()),
            Some(exp_str) => {
                let requested_secs = parse_duration_to_secs(exp_str).unwrap_or(3600);
                if requested_secs > 3600 {
                    println!("\x1b[1;33m[!] Notice: Free tier sessions are capped at 1h. Setting auto-expiry to 1h.\x1b[0m");
                    Some("1h".to_string())
                } else {
                    Some(exp_str.to_string())
                }
            }
        }
    } else {
        args.expires.clone()
    };

    let expires_epoch_secs = effective_expires.as_deref().and_then(parse_duration_to_secs).map(|secs| {
        started_epoch_secs + secs
    });

    // ── 4. Stand up proxies and tunnels for each service ────────────────────
    let mut active_services: Vec<ActiveService> = Vec::new();

    for s in &services {
        let tunnel_id = format!("tun-stack-{}-{}", s.port, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_millis());

        // Start intercepting proxy
        let proxy_port = match proxync_core::proxy::start_proxy_with_auth(event_tx.clone(), s.port, s.basic_auth.clone()).await {
            Ok(p) => p,
            Err(e) if s.basic_auth.is_some() => {
                eprintln!("\x1b[1;31m[!] Error: Failed to start authenticated proxy for '{}': {}\x1b[0m", s.name, e);
                // Clean up any previously started services
                for act in &active_services {
                    let _ = proxync_core::registry::unregister_tunnel(&act.tunnel_id);
                    let _ = proxync_core::tunnel::close_tunnel(act.tunnel_id.clone(), Some(act.port)).await;
                    let _ = proxync_core::proxy::stop_proxy(Some(act.port)).await;
                }
                return Err("Failed to start proxy.".into());
            }
            Err(_) => s.port,
        };

        // Open public tunnel
        let public_url = match args.provider {
            Provider::Cloudflare => {
                proxync_core::tunnel::open_cloudflare_tunnel(event_tx.clone(), tunnel_id.clone(), proxy_port).await
                    .map_err(|e| format!("Failed to open Cloudflare tunnel for '{}': {}", s.name, e))?
            }
            Provider::Native => {
                let sub = "auto".to_string();
                proxync_core::tunnel::open_native_tunnel(event_tx.clone(), tunnel_id.clone(), proxy_port, sub).await
                    .map_err(|e| format!("Failed to open Native tunnel for '{}': {}", s.name, e))?
            }
            Provider::Relay => {
                format!("ws://relay/{}", tunnel_id)
            }
        };

        // Register in persistent registry
        let entry = proxync_core::registry::TunnelEntry {
            id: tunnel_id.clone(),
            port: s.port,
            public_url: public_url.clone(),
            provider: format!("{:?}", args.provider).to_lowercase(),
            pid: std::process::id(),
            started_at: proxync_core::storage::get_current_iso_timestamp(),
            started_epoch_secs,
            expires_at: effective_expires.clone(),
            expires_epoch_secs,
        };
        let _ = proxync_core::registry::register_tunnel(&entry);

        active_services.push(ActiveService {
            name: s.name.clone(),
            port: s.port,
            tunnel_id,
            public_url,
            _proxy_port: proxy_port,
        });
    }

    // ── 5. Display Stack Summary Dashboard ──────────────────────────────────
    println!("\n\x1b[1;32m✓ Stack Established!\x1b[0m ({} microservices online)", active_services.len());
    println!("┌────────────────────────────────────────────────────────────────────────┐");
    for s in &active_services {
        println!(
            "│ \x1b[1;36m{:<12}\x1b[0m : \x1b[1;34;4m{:<40}\x1b[0m → :{} │",
            s.name, s.public_url, s.port
        );
    }
    println!("└────────────────────────────────────────────────────────────────────────┘");

    if is_admin {
        println!("  Tier         : \x1b[1;35mAdmin (Unlimited Session)\x1b[0m");
    } else {
        println!("  Tier         : \x1b[1;33mFree (1h Max Session Limit)\x1b[0m");
    }

    if let Some(ref exp) = effective_expires {
        println!("  Auto-Expiry  : \x1b[1;33m{}\x1b[0m", exp);
    }

    println!("\nStreaming live multi-service traffic. Press \x1b[1mCtrl+C\x1b[0m to close entire stack.");
    print_hotkey_bar(true);

    // Map port -> service name for enriched terminal logs
    let port_to_name: HashMap<u16, String> = active_services.iter().map(|s| (s.port, s.name.clone())).collect();
    let port_to_name_arc = Arc::new(port_to_name);

    let logging_enabled = !args.no_log;
    let show_terminal_arc = Arc::new(AtomicBool::new(true));
    let show_terminal_event = show_terminal_arc.clone();
    let stats_arc = Arc::new(Mutex::new(SessionStats::default()));
    let stats_arc_event = stats_arc.clone();

    let (hotkey_exit_tx, mut hotkey_exit_rx) = tokio::sync::mpsc::channel::<()>(1);
    let event_exit_tx = hotkey_exit_tx.clone();

    // ── 6. Live Request Event Multiplexer ───────────────────────────────────
    let event_names = port_to_name_arc.clone();
    let event_task = tokio::spawn(async move {
        while let Ok(event) = event_rx.recv().await {
            match event {
                ProxyncEvent::RequestLog { id, method, path, port, .. } => {
                    let mut st = stats_arc_event.lock().await;
                    st.total_requests += 1;
                    drop(st);

                    if show_terminal_event.load(Ordering::Relaxed) {
                        let name = event_names.get(&port).map(|s| s.as_str()).unwrap_or("app");
                        println!(
                            "\x1b[1;35m[{:<8}]\x1b[0m \x1b[1;33m--> {:<6}\x1b[0m {} \x1b[90m(:{} id: {})\x1b[0m",
                            name, method, path, port, id
                        );
                    }
                }
                ProxyncEvent::ResponseLog { status, duration_ms, .. } => {
                    let mut st = stats_arc_event.lock().await;
                    if (200..300).contains(&status) {
                        st.success_2xx += 1;
                    } else if (300..400).contains(&status) {
                        st.redirect_3xx += 1;
                    } else if (400..500).contains(&status) {
                        st.client_err_4xx += 1;
                    } else if status >= 500 {
                        st.server_err_5xx += 1;
                    }
                    st.total_duration_ms += duration_ms;
                    drop(st);

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
                        println!("           \x1b[90mstatus:\x1b[0m {}{}\x1b[0m \x1b[90m({}ms)\x1b[0m", status_color, status, duration_ms);
                    }
                }
                ProxyncEvent::TunnelStatusChanged { port, status, .. } => {
                    let name = event_names.get(&port).map(|s| s.as_str()).unwrap_or("app");
                    if status == "STANDBY" {
                        println!("\x1b[1;33m[STANDBY]\x1b[0m Service '{}' on port {} is offline.", name, port);
                    } else if status == "ACTIVE" {
                        println!("\x1b[1;32m[ACTIVE]\x1b[0m Service '{}' on port {} is back online!", name, port);
                    }
                }
                _ => {}
            }
        }
        let _ = event_exit_tx.send(()).await;
    });

    // Auto-expiry timer if set
    if let Some(exp_secs) = expires_epoch_secs {
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let diff = exp_secs.saturating_sub(now_secs);
        let hotkey_tx_clone = hotkey_exit_tx.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(diff)).await;
            println!("\n\x1b[1;33m[!] Stack session reached duration limit ({}s).\x1b[0m", diff);
            let _ = hotkey_tx_clone.send(()).await;
        });
    }

    // ── 7. Wait for shutdown signal ─────────────────────────────────────────
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            println!("\n\x1b[33m==> Shutting down stack...\x1b[0m");
        }
        Some(()) = hotkey_exit_rx.recv() => {
            println!("\n\x1b[33m==> Shutting down stack...\x1b[0m");
        }
        _ = event_task => {}
    }

    // ── 8. Cleanly terminate all stack services ─────────────────────────────
    for s in &active_services {
        let _ = proxync_core::registry::unregister_tunnel(&s.tunnel_id);
        let _ = proxync_core::tunnel::close_tunnel(s.tunnel_id.clone(), Some(s.port)).await;
        let _ = proxync_core::proxy::stop_proxy(Some(s.port)).await;
        if logging_enabled {
            let msg = format!("[{}] [INFO] [STACK] Closed tunnel for service '{}' (port {})", proxync_core::storage::get_current_iso_timestamp(), s.name, s.port);
            let _ = proxync_core::storage::append_log_entry("cli".into(), msg).await;
        }
    }

    println!("\x1b[1;32m✓ All {} microservice tunnels closed cleanly.\x1b[0m", active_services.len());
    Ok(())
}
