use crate::args::ScanArgs;
use crate::ui::{truncate_path_tail, truncate_str};
use proxync_core::recon::scan_processes;

pub async fn handle_scan(args: ScanArgs) -> Result<(), Box<dyn std::error::Error>> {
    let procs = scan_processes(args.force).await.map_err(|e| format!("Scan failed: {}", e))?;

    if args.json {
        println!("{}", serde_json::to_string_pretty(&procs)?);
        return Ok(());
    }

    if procs.is_empty() {
        println!("\x1b[33mNo active local dev servers or listeners detected.\x1b[0m");
        println!("Start your server (e.g. `npm run dev`) and run `proxync scan` again.");
        return Ok(());
    }

    println!("\x1b[1m{:<7} {:<16} {:<24} {:<8} {:<30}\x1b[0m", "PORT", "FRAMEWORK", "PROCESS", "PID", "DIRECTORY");
    println!("{}", "─".repeat(88));

    for p in &procs {
        let fw = p.framework.clone().unwrap_or_else(|| "-".to_string());
        let pid_str = p.pid.map(|n| n.to_string()).unwrap_or_else(|| "-".to_string());
        let dir = p.directory.as_deref().unwrap_or("-");
        let display_dir = truncate_path_tail(dir, 30);

        let fw_color = match fw.as_str() {
            "Next.js" | "React" | "Vite" => "\x1b[32m", // Green
            "Vue" | "Nuxt" => "\x1b[35m",                // Magenta
            "FastAPI" | "Django" | "Flask" => "\x1b[34m",// Blue
            "Rust" | "Go" => "\x1b[36m",                 // Cyan
            _ => "\x1b[0m",
        };

        println!(
            "\x1b[1;33m{:<7}\x1b[0m {}{:<16}\x1b[0m {:<24} {:<8} {:<30}",
            p.port,
            fw_color,
            fw,
            truncate_str(&p.name, 24),
            pid_str,
            display_dir
        );
    }

    println!("\nTip: Expose any port to the web with: \x1b[1;36mproxync tunnel <port>\x1b[0m");

    let current_version = env!("CARGO_PKG_VERSION");
    if let Ok(Some(info)) = proxync_core::cli_installer::check_for_cli_update(current_version).await {
        println!("\x1b[1;33m💡 Update available: v{} → {} (Run 'proxync update' to upgrade)\x1b[0m", current_version, info.latest_version);
    }

    Ok(())
}
