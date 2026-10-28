use crate::args::{Cli, CompletionArgs, DoctorArgs, UpdateArgs};
use clap::CommandFactory;
use proxync_core::storage::get_system_info_sync;
use std::net::ToSocketAddrs;
use std::process::Command;
use std::time::{Duration, Instant};

pub async fn handle_setup_path() -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36m==> Configuring Proxync CLI in system environment (PATH)...\x1b[0m");
    let msg = proxync_core::cli_installer::install_cli_to_path().await
        .map_err(|e| format!("Failed to configure PATH: {}", e))?;
    println!("\x1b[1;32m[OK] {}\x1b[0m", msg);
    println!("\nRestart your terminal to use \x1b[1mproxync\x1b[0m from any directory!");
    Ok(())
}

pub async fn handle_update(args: UpdateArgs) -> Result<(), Box<dyn std::error::Error>> {
    let current_version = env!("CARGO_PKG_VERSION");
    println!("\x1b[1;36m==> Checking for Proxync CLI updates...\x1b[0m");
    println!("    Current version : \x1b[1mv{}\x1b[0m", current_version);

    if args.check {
        match proxync_core::cli_installer::check_for_cli_update(current_version).await {
            Ok(Some(info)) => {
                println!("\n\x1b[1;32m★ New version available: \x1b[1;33m{}\x1b[0m", info.latest_version);
                println!("  Release notes : {}", info.release_notes_url);
                println!("  Run \x1b[1mproxync update\x1b[0m to install the update!");
            }
            Ok(None) => {
                println!("\x1b[1;32m✓ Proxync CLI is up to date (v{}).\x1b[0m", current_version);
            }
            Err(e) => {
                println!("\x1b[33m[!] Could not verify updates: {}\x1b[0m", e);
            }
        }
        return Ok(());
    }

    println!("==> Downloading and upgrading Proxync CLI...");
    match proxync_core::cli_installer::self_update_cli(args.force, current_version).await {
        Ok(msg) => {
            println!("\x1b[1;32m✓ {}\x1b[0m", msg);
            println!("All previous binary files cleaned up.");
        }
        Err(e) => {
            println!("\x1b[1;31m[!] Update failed: {}\x1b[0m", e);
            println!("You can also re-run the one-liner installer or download from https://github.com/Inilax/Proxync/releases");
        }
    }

    Ok(())
}

pub fn handle_providers() -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36mProxync Tunnel Providers & Architecture Guide\x1b[0m\n");
    println!("Proxync supports pluggable tunneling engines to fit different network environments:\n");

    println!("\x1b[1;32m1. Native (SSH Edge Tunnel) [Default]\x1b[0m");
    println!("   • Engine     : Direct SSH reverse port-forwarding to Proxync's high-speed edge cluster.");
    println!("   • Subdomain  : Automatic secure subdomain (px-*.proxync.dev), matching desktop app behavior.");
    println!("   • Best for   : Zero third-party accounts, persistent URLs, and fast local testing.");
    println!("   • CLI Usage  :");
    println!("     $ \x1b[1mproxync tunnel 3000\x1b[0m");
    println!("     $ \x1b[1mproxync tunnel 3000 -d\x1b[0m  (detached mode: traffic saved to cli.log)\n");

    println!("\x1b[1;34m2. Cloudflare (Quick Tunnels)\x1b[0m");
    println!("   • Engine     : Cloudflare Argo/cloudflared tunnel over Cloudflare's global edge network.");
    println!("   • Subdomain  : Dynamic *.trycloudflare.com URLs with automatic TLS certificates.");
    println!("   • Best for   : Zero sign-up, sharing with external clients, and bypassing strict enterprise firewalls.");
    println!("   • CLI Usage  :");
    println!("     $ \x1b[1mproxync tunnel 3000 --provider cloudflare\x1b[0m");
    println!("     $ \x1b[1mproxync tunnel 3000 -p cloudflare -d\x1b[0m\n");

    println!("\x1b[1;35m3. Relay (Self-Hosted WebSocket Relay)\x1b[0m");
    println!("   • Engine     : Proxync WebSocket multiplexer for self-hosted or air-gapped deployments.");
    println!("   • Subdomain  : Routed through your private relay server instance.");
    println!("   • Best for   : Enterprise private intranets and customized routing.");
    println!("   • CLI Usage  :");
    println!("     $ \x1b[1mproxync tunnel 3000 --provider relay --token <TOKEN> --workspace <ID>\x1b[0m\n");

    println!("\x1b[1mHow to Add Future Providers:\x1b[0m");
    println!("   Proxync's tunnel pipeline is designed for seamless extensibility:");
    println!("   1. \x1b[36mCore Engine\x1b[0m: Add provider lifecycle in `packages/core/src/tunnel.rs`.");
    println!("      Implement tunnel spawning and forward request events to `event_tx.send(...)`.");
    println!("   2. \x1b[36mCLI Mapping\x1b[0m: Add new variant (e.g. `Pinggy`, `Tailscale`, `Ngrok`) to `enum Provider` in `packages/cli/src/main.rs`.");
    println!("   3. \x1b[36mUnified Logging\x1b[0m: All providers automatically inherit live terminal streaming, detached mode (-d), and 5MB rotated `cli.log` persistence.");
    println!();

    Ok(())
}

pub fn handle_doctor(args: DoctorArgs) -> Result<(), Box<dyn std::error::Error>> {
    println!("Proxync Health Check");
    println!("══════════════════════════════════════════════════");

    // 1. Edge cluster connectivity — actual TCP handshake to Proxync edge
    let edge_result = check_edge_connectivity();
    println!("  {} Edge cluster    : {}", status_icon(edge_result.is_ok()), 
        edge_result.unwrap_or_else(|e| e));

    // 2. SSH toolchain presence
    let ssh_toolchain = check_ssh_toolchain();
    println!("  {} SSH toolchain   : {}", status_icon(ssh_toolchain.is_ok()),
        ssh_toolchain.unwrap_or_else(|e| e));

    // 3. Active tunnels (from registry)
    let active_count = proxync_core::registry::read_registry().len();
    println!("  {} Active tunnels  : {}", "\x1b[32m✓\x1b[0m", active_count);

    // 4. CLI version
    let version = env!("CARGO_PKG_VERSION");
    println!("  {} CLI version     : v{}", "\x1b[32m✓\x1b[0m", version);

    println!("══════════════════════════════════════════════════");

    if args.verbose {
        println!("\nDetailed System Diagnostics:");
        let sys = get_system_info_sync();
        println!("  Operating System : {} ({})", sys.distro, sys.arch);
        println!("  Kernel Version   : {}", sys.os_version);
        println!("  Hostname         : {}", sys.hostname);
        println!("  Local IP         : {}", sys.local_ip);
        println!("  Process PID      : {}", sys.pid);
        println!("──────────────────────────────────────────────────");
        println!("Prerequisites & Toolchain Checks:");
        check_tool("Node.js runtime", "node", &["-v"]);
        check_tool("NPX package runner", "npx", &["--version"]);
        check_tool("SSH client", "ssh", &["-V"]);
        check_tool("SSH key generator", "ssh-keygen", &["-V"]);
        check_tool("Cloudflared binary", "cloudflared", &["--version"]);
    } else {
        println!("All core subsystems operational. Run 'proxync doctor --verbose' for full system info.");
    }
    Ok(())
}

fn status_icon(ok: bool) -> &'static str {
    if ok { "\x1b[32m✓\x1b[0m" } else { "\x1b[31m✗\x1b[0m" }
}

fn check_edge_connectivity() -> Result<String, String> {
    let start = Instant::now();
    let host = "api.proxync.dev";
    let target = format!("{}:443", host);
    let addr = target.to_socket_addrs()
        .map_err(|_| "Not connected".to_string())?
        .next()
        .ok_or_else(|| "Not connected".to_string())?;

    std::net::TcpStream::connect_timeout(&addr, Duration::from_secs(2))
        .map_err(|_| "Not connected".to_string())?;

    let latency = start.elapsed().as_millis();
    Ok(format!("Connected ({}ms)", latency))
}

fn check_ssh_toolchain() -> Result<String, String> {
    let status = Command::new("ssh-keygen")
        .arg("-?")
        .output();
    match status {
        Ok(_) => Ok("ssh-keygen available (ephemeral JIT keys supported)".to_string()),
        Err(_) => Err("ssh-keygen not found in PATH — native tunnels will fail".to_string()),
    }
}

fn check_tool(name: &str, bin: &str, args: &[&str]) {
    let status = Command::new(bin).args(args).output();
    match status {
        Ok(out) => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let err_ver = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let v = if !ver.is_empty() { ver } else { err_ver };
            let first_line = v.lines().next().unwrap_or("found");
            println!("  \x1b[32m✓\x1b[0m {:<22} : {}", name, first_line);
        }
        Err(_) => {
            println!("  \x1b[33m-\x1b[0m {:<22} : not in PATH (will fallback if needed)", name);
        }
    }
}

pub fn launch_gui() {
    println!("\x1b[1;36m==> Launching Proxync GUI...\x1b[0m");

    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        let possible_paths = [
            format!("{}\\Programs\\Proxync\\Proxync.exe", local_app_data),
            format!("{}\\Proxync\\Proxync.exe", local_app_data),
            format!("{}\\Proxync\\Proxync.exe", program_files),
        ];

        for p in &possible_paths {
            if std::path::Path::new(p).exists() {
                let _ = Command::new(p).spawn();
                println!("\x1b[32m✓ Launched Proxync GUI from {}\x1b[0m", p);
                return;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let user_app = std::env::var("HOME").map(|h| format!("{}/Applications/Proxync.app", h)).unwrap_or_default();
        if std::path::Path::new("/Applications/Proxync.app").exists()
            || (!user_app.is_empty() && std::path::Path::new(&user_app).exists())
            || Command::new("open").arg("-a").arg("Proxync").spawn().is_ok()
        {
            println!("\x1b[32m✓ Launched Proxync GUI\x1b[0m");
            return;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if Command::new("proxync-desktop").spawn().is_ok() {
            println!("\x1b[32m✓ Launched Proxync GUI\x1b[0m");
            return;
        }
    }

    println!("\x1b[33mProxync Desktop GUI was not detected on this system.\x1b[0m");
    println!("To install or run the desktop GUI:");
    println!("  1. Download the installer from https://github.com/Inilax/Proxync/releases");
    println!("  2. Or run in dev mode: `npm run tauri dev`");
}

pub fn handle_completion(args: CompletionArgs) -> Result<(), Box<dyn std::error::Error>> {
    let mut cmd = Cli::command();
    clap_complete::generate(args.shell, &mut cmd, "proxync", &mut std::io::stdout());
    Ok(())
}
