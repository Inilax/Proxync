use crate::args::{OpenArgs, StatusArgs, StopArgs};
use crate::ui::{elapsed_since, format_duration_human, open_in_browser, truncate_str};
use proxync_core::recon::scan_processes;
use std::process::Command;

pub async fn handle_ps() -> Result<(), Box<dyn std::error::Error>> {
    // ponytail: sync fs read — acceptable, registry is tiny (<10 entries). Upgrade to tokio::fs if it grows.
    let tunnels = proxync_core::registry::read_registry();

    println!("\x1b[1;36mActive Tunnels:\x1b[0m");
    if tunnels.is_empty() {
        println!("  \x1b[90mNo active tunnels found.\x1b[0m");
    } else {
        println!("  \x1b[1m{:<6} {:<38} {:<12} {:<8} {:<10} {:<10}\x1b[0m", "PORT", "PUBLIC URL", "PROVIDER", "PID", "UPTIME", "EXPIRES");
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        for t in &tunnels {
            let uptime_secs = now_secs.saturating_sub(t.started_epoch_secs);
            let uptime_str = format_duration_human(uptime_secs);
            let expires_str = match t.expires_epoch_secs {
                Some(exp) if exp > now_secs => format_duration_human(exp - now_secs),
                Some(_) => "expired".to_string(),
                None => "never".to_string(),
            };
            println!(
                "  \x1b[1;32m{:<6}\x1b[0m \x1b[1;34m{:<38}\x1b[0m {:<12} {:<8} {:<10} {:<10}",
                t.port,
                truncate_str(&t.public_url, 38),
                t.provider,
                t.pid,
                uptime_str,
                expires_str
            );
        }
    }

    println!("\n\x1b[1;36mDetected Local Dev Servers:\x1b[0m");
    let procs = scan_processes(false).await.unwrap_or_default();
    if procs.is_empty() {
        println!("  \x1b[90mNo running dev servers detected.\x1b[0m");
    } else {
        println!("  \x1b[1m{:<6} {:<16} {:<24} {:<8}\x1b[0m", "PORT", "FRAMEWORK", "NAME", "PID");
        for p in &procs {
            let fw = p.framework.as_deref().unwrap_or("-");
            let pid_str = p.pid.map(|n| n.to_string()).unwrap_or_else(|| "-".to_string());
            println!(
                "  \x1b[1;33m{:<6}\x1b[0m {:<16} {:<24} {:<8}",
                p.port,
                truncate_str(fw, 16),
                truncate_str(&p.name, 24),
                pid_str
            );
        }
    }
    Ok(())
}

pub async fn handle_stop(args: StopArgs) -> Result<(), Box<dyn std::error::Error>> {
    let registry = proxync_core::registry::read_registry();
    if registry.is_empty() {
        println!("No active tunnels to stop.");
        return Ok(());
    }

    let target_str = match args.target {
        Some(t) => t,
        None if registry.len() == 1 => registry[0].id.clone(),
        None => {
            println!("Multiple active tunnels. Please specify which to stop:");
            for t in &registry {
                println!("  proxync stop {:<6} (ID: {}) -> {}", t.port, t.id, t.public_url);
            }
            println!("  proxync stop all");
            return Ok(());
        }
    };

    let targets: Vec<proxync_core::registry::TunnelEntry> = if target_str.eq_ignore_ascii_case("all") {
        registry
    } else if let Ok(port) = target_str.parse::<u16>() {
        registry.into_iter().filter(|t| t.port == port).collect()
    } else {
        registry.into_iter().filter(|t| t.id == target_str).collect()
    };

    if targets.is_empty() {
        eprintln!("\x1b[1;33m[!] No active tunnel found for '{}'.\x1b[0m", target_str);
        return Ok(());
    }

    let count = targets.len();
    for t in targets {
        kill_process_tree(t.pid);

        // Wait for the process to exit (poll up to 3s with 100ms intervals) before unregistering
        let mut exited = !proxync_core::registry::is_process_alive(t.pid);
        if !exited {
            for _ in 0..30 {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                if !proxync_core::registry::is_process_alive(t.pid) {
                    exited = true;
                    break;
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        if !exited {
            let _ = Command::new("kill").args(["-KILL", &t.pid.to_string()]).output();
            exited = !proxync_core::registry::is_process_alive(t.pid);
        }

        if let Err(e) = proxync_core::registry::unregister_tunnel(&t.id) {
            eprintln!("\x1b[33mWarning: failed to update registry for tunnel {}: {}\x1b[0m", t.id, e);
        }

        if exited {
            println!("\x1b[1;32m✓ Stopped tunnel on port {}\x1b[0m (PID {}) — {}", t.port, t.pid, t.public_url);
        } else {
            println!("\x1b[33m[!] Process {} did not terminate within 3s. Registry entry removed.\x1b[0m", t.pid);
        }

        let msg = format!(
            "[{}] [INFO] [TUNNEL] Stopped tunnel on port {} (PID {}) via CLI",
            proxync_core::storage::get_current_iso_timestamp(),
            t.port,
            t.pid
        );
        let _ = proxync_core::storage::append_log_entry("cli".into(), msg).await;
    }

    if count > 1 {
        println!("\x1b[1;32m✓ Stopped {} active tunnels.\x1b[0m", count);
    }

    Ok(())
}

pub fn kill_process_tree(pid: u32) {
    if pid == 0 {
        return;
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new("taskkill");
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        let _ = cmd.args(["/F", "/T", "/PID", &pid.to_string()]).output();
    }

    #[cfg(not(target_os = "windows"))]
    {
        // First terminate child processes in tree to prevent zombies (RCA-004)
        let _ = Command::new("pkill").args(["-TERM", "-P", &pid.to_string()]).output();
        let _ = Command::new("kill").args(["-TERM", &pid.to_string()]).output();
    }
}

pub async fn handle_status(args: StatusArgs) -> Result<(), Box<dyn std::error::Error>> {
    let registry = proxync_core::registry::read_registry();
    if registry.is_empty() {
        println!("No active tunnels found.");
        return Ok(());
    }

    let target_entry = match args.target {
        Some(ref target) => {
            if let Ok(port) = target.parse::<u16>() {
                registry.into_iter().find(|t| t.port == port)
            } else {
                registry.into_iter().find(|t| t.id == *target)
            }
        }
        None if registry.len() == 1 => Some(registry[0].clone()),
        None => return handle_ps().await,
    };

    match target_entry {
        Some(t) => {
            let is_alive = proxync_core::registry::is_process_alive(t.pid);
            let port_listening = proxync_core::recon::probe_port(t.port).await.unwrap_or(false);
            let uptime = elapsed_since(t.started_epoch_secs);
            let now_secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
            let expires_info = match t.expires_epoch_secs {
                Some(exp) if exp > now_secs => format!("{} (in {})", t.expires_at.as_deref().unwrap_or(""), format_duration_human(exp - now_secs)),
                Some(_) => "expired".to_string(),
                None => "never (manual stop)".to_string(),
            };

            println!("\x1b[1;36mProxync Tunnel Diagnostic Status:\x1b[0m");
            println!("  Port           : \x1b[1m{}\x1b[0m (Local service listening: {})", 
                t.port, 
                if port_listening { "\x1b[32mYES\x1b[0m" } else { "\x1b[33mSTANDBY / OFFLINE\x1b[0m" }
            );
            println!("  Public URL     : \x1b[1;34;4m{}\x1b[0m", t.public_url);
            println!("  Provider       : {}", t.provider);
            println!("  Process PID    : {} ({})", t.pid, if is_alive { "\x1b[32mALIVE\x1b[0m" } else { "\x1b[31mDEAD\x1b[0m" });
            println!("  Tunnel ID      : {}", t.id);
            println!("  Started At     : {} (Uptime: {})", t.started_at, uptime);
            println!("  Auto-Expiry    : {}", expires_info);
            println!("  CLI Logs       : {}", proxync_core::storage::get_logs_dir().join("cli.log").display());
        }
        None => {
            eprintln!("\x1b[1;33m[!] No active tunnel matched your target.\x1b[0m");
            eprintln!("    Run \x1b[1mproxync ps\x1b[0m to list running tunnels.");
        }
    }

    Ok(())
}

pub fn handle_open(args: OpenArgs) -> Result<(), Box<dyn std::error::Error>> {
    let tunnels = proxync_core::registry::read_registry();
    if tunnels.is_empty() {
        eprintln!("\x1b[1;33m[!] No active tunnels running.\x1b[0m");
        eprintln!("    Start one with: \x1b[1mproxync <port>\x1b[0m");
        return Ok(());
    }

    let url_to_open = if let Some(ref target) = args.target {
        if let Ok(port) = target.parse::<u16>() {
            tunnels.iter().find(|t| t.port == port).map(|t| t.public_url.clone())
        } else {
            tunnels.iter().find(|t| t.id == *target).map(|t| t.public_url.clone())
        }
    } else if tunnels.len() == 1 {
        Some(tunnels[0].public_url.clone())
    } else {
        println!("Multiple active tunnels. Please specify which port to open:");
        for t in &tunnels {
            println!("  proxync open {:<6} -> {}", t.port, t.public_url);
        }
        return Ok(());
    };

    match url_to_open {
        Some(url) => {
            println!("✓ Opening \x1b[1;34m{}\x1b[0m in your default browser...", url);
            open_in_browser(&url);
        }
        None => {
            eprintln!("\x1b[1;33m[!] No active tunnel matched your target.\x1b[0m");
        }
    }
    Ok(())
}
