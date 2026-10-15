mod args;
mod commands;
mod ui;

use args::*;
use clap::Parser;
use commands::{inspect::*, logs::*, manage::*, scan::*, serve::*, system::*, tunnel::*};
use proxync_core::recon::scan_processes;
use ui::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let raw_args: Vec<String> = std::env::args().collect();
    let args = preprocess_cli_args(raw_args);
    let cli = Cli::parse_from(args);

    if cli.gui {
        launch_gui();
        return Ok(());
    }

    match cli.command {
        Some(Commands::Scan(args)) => handle_scan(args).await?,
        Some(Commands::Tunnel(args)) => handle_tunnel(args).await?,
        Some(Commands::Inspect(args)) => handle_proxy(args).await?,
        Some(Commands::Serve(args)) => handle_serve(args).await?,
        Some(Commands::Ps) => handle_ps().await?,
        Some(Commands::Stop(args)) => handle_stop(args).await?,
        Some(Commands::Status(args)) => handle_status(args).await?,
        Some(Commands::Open(args)) => handle_open(args)?,
        Some(Commands::Logs(args)) => handle_logs(args).await?,
        Some(Commands::Providers) => handle_providers()?,
        Some(Commands::Doctor(args)) => handle_doctor(args)?,
        Some(Commands::Gui) => launch_gui(),
        Some(Commands::Install) => handle_setup_path().await?,
        Some(Commands::Update(args)) => handle_update(args).await?,
        Some(Commands::Replay(args)) => handle_replay(args).await?,
        Some(Commands::Completion(args)) => handle_completion(args)?,
        None => {
            let current_version = env!("CARGO_PKG_VERSION");
            println!("\x1b[1;36mProxync\x1b[0m — Developer Tunneling & Reconnaissance CLI (\x1b[1mv{}\x1b[0m)", current_version);
            println!("Run \x1b[1mproxync --help\x1b[0m for available commands.\n");

            // Run update check and process scan concurrently (zero latency penalty on offline/slow networks)
            let (update_result, procs_result) = tokio::join!(
                proxync_core::cli_installer::check_for_cli_update(current_version),
                scan_processes(false)
            );

            // Display update banner non-blockingly
            if let Ok(Some(info)) = update_result {
                println!("\x1b[1;32m★ New version available:\x1b[0m v{} → \x1b[1;33m{}\x1b[0m (Run 'proxync update' to upgrade)\n", current_version, info.latest_version);
            }

            let procs = procs_result.unwrap_or_default();
            if procs.is_empty() {
                println!("No running dev servers detected.");
                println!("Start your server (e.g. `npm run dev`) then run `proxync` again.");
                return Ok(());
            }
            if procs.len() == 1 {
                let p = &procs[0];
                let is_vite = p.framework.as_deref().unwrap_or(&p.name).to_lowercase().contains("vite");
                if is_vite {
                    let fw = p.framework.as_deref().unwrap_or(&p.name);
                    println!("\x1b[33m[!] Discovered {} on port {}.\x1b[0m", fw, p.port);
                    println!("    Sharing Vite dev servers over public tunnels is currently under development (HMR / host header constraints).");
                    println!("    To expose it anyway, run: \x1b[1mproxync tunnel {} --force\x1b[0m\n", p.port);
                    return Ok(());
                }
                println!("✓ Discovered {} on port {} — exposing to public tunnel...", 
                    p.framework.as_deref().unwrap_or(&p.name), p.port);
                handle_tunnel(TunnelArgs { 
                    port: p.port, 
                    provider: Provider::Native, 
                    detach: false, 
                    qr: false, 
                    basic_auth: None, 
                    expires: None, 
                    token: None, 
                    workspace: None, 
                    relay_url: None, 
                    no_log: false,
                    force: false,
                    daemon_worker: false,
                }).await?;
            } else {
                let selected = interactive_port_picker(&procs)?;
                handle_tunnel(TunnelArgs { 
                    port: selected, 
                    provider: Provider::Native, 
                    detach: false, 
                    qr: false, 
                    basic_auth: None, 
                    expires: None, 
                    token: None, 
                    workspace: None, 
                    relay_url: None, 
                    no_log: false,
                    force: false,
                    daemon_worker: false,
                }).await?;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_parsing_tunnel_default_provider() {
        let args = ["proxync", "tunnel", "3000"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert_eq!(t.provider, Provider::Native);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_tunnel() {
        let args = ["proxync", "tunnel", "3000", "--provider", "native"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert_eq!(t.provider, Provider::Native);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_scan() {
        let args = ["proxync", "scan", "--json", "-f"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Scan(s)) => {
                assert!(s.json);
                assert!(s.force);
            }
            _ => panic!("expected scan command"),
        }
    }

    #[test]
    fn test_cli_parsing_no_log_flag() {
        let args = ["proxync", "tunnel", "3000", "--no-log"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert!(t.no_log);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_proxy_no_log() {
        let args = ["proxync", "proxy", "8080", "--no-log"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Inspect(p)) => {
                assert!(p.no_log);
                assert_eq!(p.port, 8080);
            }
            _ => panic!("expected inspect command"),
        }
    }

    #[test]
    fn test_cli_parsing_proxy_detach() {
        let args = ["proxync", "proxy", "8080", "-d"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Inspect(p)) => {
                assert!(p.detach);
                assert_eq!(p.port, 8080);
            }
            _ => panic!("expected inspect command"),
        }
    }

    #[test]
    fn test_cli_parsing_share_alias() {
        let args = ["proxync", "share", "3000"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => assert_eq!(t.port, 3000),
            _ => panic!("expected tunnel command from share alias"),
        }
    }

    #[test]
    fn test_preprocess_cli_args_direct_port() {
        let raw = vec!["proxync".into(), "3000".into(), "-d".into()];
        let processed = preprocess_cli_args(raw);
        assert_eq!(processed, vec!["proxync", "tunnel", "3000", "-d"]);
        let cli = Cli::try_parse_from(processed).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert!(t.detach);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_preprocess_cli_args_flags_before_port() {
        let raw = vec!["proxync".into(), "-p".into(), "cloudflare".into(), "3000".into()];
        let processed = preprocess_cli_args(raw);
        assert_eq!(processed, vec!["proxync", "tunnel", "-p", "cloudflare", "3000"]);
        let cli = Cli::try_parse_from(processed).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert_eq!(t.provider, Provider::Cloudflare);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_tunnel_basic_auth() {
        let args = ["proxync", "tunnel", "3000", "--basic-auth", "admin:secret123", "--expires", "30m", "--force"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert_eq!(t.basic_auth.as_deref(), Some("admin:secret123"));
                assert_eq!(t.expires.as_deref(), Some("30m"));
                assert!(t.force);
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_tunnel_basic_auth_from_env() {
        std::env::set_var("PROXYNC_BASIC_AUTH", "envuser:envpass");
        let args = ["proxync", "tunnel", "3000"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        std::env::remove_var("PROXYNC_BASIC_AUTH");
        match cli.command {
            Some(Commands::Tunnel(t)) => {
                assert_eq!(t.port, 3000);
                assert_eq!(t.basic_auth.as_deref(), Some("envuser:envpass"));
            }
            _ => panic!("expected tunnel command"),
        }
    }

    #[test]
    fn test_cli_parsing_serve_allow_large() {
        let args = ["proxync", "serve", "./dist", "--allow-large"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Serve(s)) => {
                assert_eq!(s.path, "./dist");
                assert!(s.allow_large);
            }
            _ => panic!("expected serve command"),
        }
    }

    #[test]
    fn test_cli_parsing_doctor_verbose() {
        let args = ["proxync", "doctor", "--verbose"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Doctor(d)) => assert!(d.verbose),
            _ => panic!("expected doctor command"),
        }
    }

    #[test]
    fn test_parse_duration_to_secs() {
        assert_eq!(parse_duration_to_secs("30s"), Some(30));
        assert_eq!(parse_duration_to_secs("15m"), Some(900));
        assert_eq!(parse_duration_to_secs("1h"), Some(3600));
        assert_eq!(parse_duration_to_secs("2H"), Some(7200));
        assert_eq!(parse_duration_to_secs("60"), Some(60));
        assert_eq!(parse_duration_to_secs("invalid"), None);
    }

    #[test]
    fn test_format_duration_human() {
        assert_eq!(format_duration_human(45), "45s");
        assert_eq!(format_duration_human(60), "1m");
        assert_eq!(format_duration_human(75), "1m 15s");
        assert_eq!(format_duration_human(3600), "1h");
        assert_eq!(format_duration_human(3720), "1h 2m");
    }

    #[test]
    fn test_cli_parsing_ps_and_stop() {
        let cli_ps = Cli::try_parse_from(["proxync", "ps"]).expect("parse ps");
        match cli_ps.command {
            Some(Commands::Ps) => {}
            _ => panic!("expected ps command"),
        }

        let cli_stop = Cli::try_parse_from(["proxync", "stop", "4500"]).expect("parse stop");
        match cli_stop.command {
            Some(Commands::Stop(s)) => assert_eq!(s.target.as_deref(), Some("4500")),
            _ => panic!("expected stop command"),
        }

        let cli_status = Cli::try_parse_from(["proxync", "status", "4500"]).expect("parse status");
        match cli_status.command {
            Some(Commands::Status(s)) => assert_eq!(s.target.as_deref(), Some("4500")),
            _ => panic!("expected status command"),
        }

        let cli_open = Cli::try_parse_from(["proxync", "open", "4500"]).expect("parse open");
        match cli_open.command {
            Some(Commands::Open(o)) => assert_eq!(o.target.as_deref(), Some("4500")),
            _ => panic!("expected open command"),
        }
    }

    #[test]
    fn test_is_tunnel_closure_log_line() {
        assert!(is_tunnel_closure_log_line("[2026-10-01T17:18:24.611Z] [INFO] [TUNNEL] Closed tunnel for port 4000", 4000));
        assert!(is_tunnel_closure_log_line("[2026-10-01T17:18:24.611Z] [INFO] [TUNNEL] Stopped tunnel on port 4000 (PID 123) via CLI", 4000));
        assert!(is_tunnel_closure_log_line("[2026-10-01T17:18:24.611Z] [WARN] [TUNNEL] Tunnel on port 4000 automatically closed after 1 hour", 4000));
        assert!(!is_tunnel_closure_log_line("[2026-10-01T17:18:24.611Z] [INFO] [TUNNEL] Closed tunnel for port 5000", 4000));
        assert!(!is_tunnel_closure_log_line("[2026-10-01T17:18:19.571Z] [REQ] GET /port 4000", 4000));
        // Strict boundary check: port 80 must NOT match 8080
        assert!(!is_tunnel_closure_log_line("[2026-10-01T17:18:24.611Z] [INFO] [TUNNEL] Closed tunnel for port 8080", 80));
    }

    #[test]
    fn test_contains_discrete_port() {
        assert!(contains_discrete_port("Closed tunnel for port 80", 80));
        assert!(!contains_discrete_port("Closed tunnel for port 8080", 80));
        assert!(contains_discrete_port("[REQ] GET / (port 3000)", 3000));
        assert!(!contains_discrete_port("[REQ] GET / (port 3000)", 300));
    }

    #[test]
    fn test_standby_idle_timeout_default() {
        assert_eq!(DEFAULT_STANDBY_IDLE_TIMEOUT.as_secs(), 3600);
    }

    #[test]
    fn test_parse_logged_request_structured() {
        let line = "[2026-10-02T00:15:00.000Z] [REQ] GET    /api/todos (id: req-test-1) (port 4000) headers={\"accept\":\"application/json\"} body={\"hello\":\"world\"}";
        let parsed = parse_logged_request(line).expect("parse req");
        assert_eq!(parsed.id, "req-test-1");
        assert_eq!(parsed.method, "GET");
        assert_eq!(parsed.path, "/api/todos");
        assert_eq!(parsed.port, 4000);
        assert_eq!(parsed.headers.get("accept").map(|s| s.as_str()), Some("application/json"));
        assert_eq!(parsed.body, "{\"hello\":\"world\"}");
    }

    #[test]
    fn test_parse_logged_request_with_body_in_header() {
        let line = "[2026-10-02T00:15:00.000Z] [REQ] POST   api/todos?filter=active (id: req-tricky) (port 4500) headers={\"x-custom\":\"test body=fake\"} body={\"real\":\"body\"}";
        let parsed = parse_logged_request(line).expect("parse tricky req");
        assert_eq!(parsed.id, "req-tricky");
        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.path, "/api/todos?filter=active"); // Normalized with leading slash
        assert_eq!(parsed.port, 4500);
        assert_eq!(parsed.headers.get("x-custom").map(|s| s.as_str()), Some("test body=fake"));
        assert_eq!(parsed.body, "{\"real\":\"body\"}");
    }

    #[test]
    fn test_parse_logged_request_empty_body() {
        let line = "[2026-10-02T00:15:00.000Z] [REQ] HEAD   / (id: req-head-1) (port 3000) headers={\"user-agent\":\"curl/8.0\"} body=";
        let parsed = parse_logged_request(line).expect("parse empty body req");
        assert_eq!(parsed.id, "req-head-1");
        assert_eq!(parsed.method, "HEAD");
        assert_eq!(parsed.path, "/");
        assert_eq!(parsed.body, "");
    }

    #[test]
    fn test_cli_parsing_replay() {
        let cli = Cli::try_parse_from(["proxync", "replay", "req-123", "--port", "4500"]).expect("parse replay");
        match cli.command {
            Some(Commands::Replay(r)) => {
                assert_eq!(r.id, "req-123");
                assert_eq!(r.port, Some(4500));
            }
            _ => panic!("expected replay command"),
        }
    }

    #[test]
    fn test_cli_parsing_completion() {
        let shells = [
            ("powershell", clap_complete::Shell::PowerShell),
            ("bash", clap_complete::Shell::Bash),
            ("zsh", clap_complete::Shell::Zsh),
            ("fish", clap_complete::Shell::Fish),
            ("elvish", clap_complete::Shell::Elvish),
        ];

        for (shell_name, expected_shell) in shells {
            let cli = Cli::try_parse_from(["proxync", "completion", shell_name]).expect("parse completion");
            match cli.command {
                Some(Commands::Completion(c)) => {
                    assert_eq!(c.shell, expected_shell);
                }
                _ => panic!("expected completion command for {}", shell_name),
            }
        }
    }

    #[test]
    fn test_cli_parsing_logs_grep() {
        let cli = Cli::try_parse_from(["proxync", "logs", "--grep", "status=500", "-n", "20"]).expect("parse logs");
        match cli.command {
            Some(Commands::Logs(l)) => {
                assert_eq!(l.grep.as_deref(), Some("status=500"));
                assert_eq!(l.lines, 20);
            }
            _ => panic!("expected logs command"),
        }
    }

    #[test]
    fn test_preprocess_cli_args_port_with_help() {
        let raw = vec!["proxync".into(), "4000".into(), "--help".into()];
        let processed = preprocess_cli_args(raw);
        assert_eq!(processed, vec!["proxync", "tunnel", "4000", "--help"]);
    }

    #[test]
    fn test_truncate_str_utf8_multibyte() {
        // Multi-byte UTF-8 emoji and non-ASCII characters
        let s = "Hello 🚀 World";
        let res = truncate_str(s, 10);
        assert_eq!(res, "Hello 🚀...");

        let accented = "Café au lait";
        let res_accent = truncate_str(accented, 8);
        assert_eq!(res_accent, "Café ...");
    }

    #[test]
    fn test_truncate_path_tail_utf8() {
        let path = "C:\\Users\\山田太郎\\Projects\\MySuperLongDirectoryName";
        let res = truncate_path_tail(path, 25);
        assert!(res.starts_with("..."));
        assert_eq!(res.chars().count(), 25);
    }

    #[test]
    fn test_preprocess_cli_args_path_prefix_routes_to_serve() {
        let raw = vec!["proxync".into(), "./some_subfolder".into()];
        let processed = preprocess_cli_args(raw);
        assert_eq!(processed, vec!["proxync", "serve", "./some_subfolder"]);
    }

    #[test]
    fn test_percent_decode_basic_and_spaces() {
        use crate::commands::serve::percent_decode;
        assert_eq!(percent_decode("hello%20world"), "hello world");
        assert_eq!(percent_decode("hello+world"), "hello world");
        assert_eq!(percent_decode("docs/api%2Fv1/report.pdf"), "docs/api/v1/report.pdf");
    }

    #[test]
    fn test_percent_decode_multibyte_utf8() {
        use crate::commands::serve::percent_decode;
        // Emoji 🚀: %F0%9F%9A%80
        assert_eq!(percent_decode("test_%F0%9F%9A%80_launch.png"), "test_🚀_launch.png");
        // Japanese: 山田 (%E5%B1%B1%E7%94%B0)
        assert_eq!(percent_decode("%E5%B1%B1%E7%94%B0/project"), "山田/project");
    }

    #[test]
    fn test_percent_decode_malformed_and_partial() {
        use crate::commands::serve::percent_decode;
        // Trailing single percent
        assert_eq!(percent_decode("100%"), "100%");
        // Incomplete percent sequence
        assert_eq!(percent_decode("discount%2"), "discount%2");
        // Invalid hex characters
        assert_eq!(percent_decode("error%ZZtest"), "error%ZZtest");
    }

    #[test]
    fn test_cli_parsing_serve_with_basic_auth_and_expires() {
        let args = ["proxync", "serve", "./public", "--basic-auth", "admin:secret", "--expires", "2h"];
        let cli = Cli::try_parse_from(args).expect("parse cli");
        match cli.command {
            Some(Commands::Serve(s)) => {
                assert_eq!(s.path, "./public");
                assert_eq!(s.basic_auth.as_deref(), Some("admin:secret"));
                assert_eq!(s.expires.as_deref(), Some("2h"));
            }
            _ => panic!("expected serve command"),
        }
    }

    #[test]
    fn test_raw_mode_guard_lifecycle() {
        let guard = crate::ui::RawModeGuard::new();
        let _ = guard.is_active();
        drop(guard);
    }

    #[test]
    fn test_calculate_dir_size_with_cap_ignores_dirs_and_early_exits() {
        use crate::ui::calculate_dir_size_with_cap;
        use std::fs;

        let temp_dir = std::env::temp_dir().join(format!("proxync_test_size_{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).expect("create temp dir");

        // Legitimate files (100 + 200 = 300 bytes)
        fs::write(temp_dir.join("app.js"), vec![b'a'; 100]).expect("write app.js");
        let sub = temp_dir.join("sub");
        fs::create_dir_all(&sub).expect("create sub");
        fs::write(sub.join("style.css"), vec![b'b'; 200]).expect("write style.css");

        // Ignored dependency & build cache directories (should be skipped!)
        let node_modules = temp_dir.join("node_modules");
        fs::create_dir_all(&node_modules).expect("create node_modules");
        fs::write(node_modules.join("dep.js"), vec![b'c'; 5000]).expect("write dep.js");

        let git_dir = temp_dir.join(".git");
        fs::create_dir_all(&git_dir).expect("create .git");
        fs::write(git_dir.join("HEAD"), vec![b'd'; 5000]).expect("write git HEAD");

        let target_dir = temp_dir.join("target");
        fs::create_dir_all(&target_dir).expect("create target");
        fs::write(target_dir.join("app.exe"), vec![b'e'; 10000]).expect("write target file");

        // Test 1: Full traversal should only count 300 bytes, ignoring node_modules, .git, and target
        let total = calculate_dir_size_with_cap(&temp_dir, 0, 8, u64::MAX);
        assert_eq!(total, 300, "Should only count legitimate source files (300 bytes)");

        // Test 2: Local .gitignore should ignore custom build directories
        fs::write(temp_dir.join(".gitignore"), "custom_cache/\nignored_assets\n# comment\n").expect("write .gitignore");
        let custom_cache = temp_dir.join("custom_cache");
        fs::create_dir_all(&custom_cache).expect("create custom_cache");
        fs::write(custom_cache.join("big.bin"), vec![b'x'; 20000]).expect("write big.bin");

        let total_with_gitignore = calculate_dir_size_with_cap(&temp_dir, 0, 8, u64::MAX);
        // 300 source bytes + .gitignore file bytes (~36 bytes)
        assert!(total_with_gitignore < 500, "Custom cache folder defined in .gitignore must be skipped");

        // Test 3: Early exit threshold (cap at 150 bytes)
        let capped = calculate_dir_size_with_cap(&temp_dir, 0, 8, 150);
        assert!(capped >= 150, "Should early-exit once exceeding 150 bytes");

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

