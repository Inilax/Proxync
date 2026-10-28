use clap::{Args, Parser, Subcommand, ValueEnum};

#[derive(Parser, Debug)]
#[command(
    name = "proxync",
    version,
    about = "Proxync CLI — Lightweight developer tunneling & reconnaissance from your terminal",
    long_about = "Proxync CLI companion provides zero-overhead dev server discovery, secure public tunneling (Cloudflare, SSH native, Relay), and traffic interception without requiring a GUI."
)]
pub struct Cli {
    /// Launch the Proxync GUI desktop application if installed
    #[arg(long, global = true)]
    pub gui: bool,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Discover running dev servers and open ports on this machine
    #[command(alias = "ls")]
    Scan(ScanArgs),

    /// Expose a local port to a public HTTPS tunnel with real-time request logging
    #[command(alias = "share")]
    Tunnel(TunnelArgs),

    /// Attach to a running tunnel or inspect live HTTP traffic forwarding to a local port
    #[command(alias = "proxy")]
    Inspect(ProxyArgs),

    /// Serve a local static folder over HTTP and instantly expose it to a public tunnel
    Serve(ServeArgs),

    /// View, tail, or clear persistent CLI session logs
    Logs(LogsArgs),

    /// List supported tunnel providers (native, cloudflare, relay) and usage instructions
    #[command(alias = "provider")]
    Providers,

    /// Inspect system environment, toolchain status, and diagnostic health
    #[command(alias = "diag")]
    Doctor(DoctorArgs),

    /// Launch or locate the Proxync GUI desktop application
    Gui,

    /// Register Proxync CLI in your system terminal environment (PATH)
    #[command(name = "install", alias = "setup-path")]
    Install,

    /// Check for updates and automatically upgrade the Proxync CLI binary in-place
    #[command(alias = "upgrade")]
    Update(UpdateArgs),

    /// List all active tunnels and detected local dev servers
    #[command(alias = "list")]
    Ps,

    /// Stop an active tunnel by port, ID, or all (stops current if only 1 active)
    Stop(StopArgs),

    /// Show detailed health and metrics for an active tunnel
    Status(StatusArgs),

    /// Open the active public tunnel URL in your default browser
    Open(OpenArgs),

    /// Replay a previously captured HTTP request against a local target service
    Replay(ReplayArgs),

    /// Generate shell tab-completion scripts for PowerShell, Bash, Zsh, Fish, or Elvish
    #[command(alias = "completions")]
    Completion(CompletionArgs),
}

#[derive(Args, Debug, Clone)]
pub struct StopArgs {
    /// Port number, tunnel ID, or 'all' (optional if only 1 tunnel is running)
    pub target: Option<String>,
}

#[derive(Args, Debug, Clone)]
pub struct StatusArgs {
    /// Target port or tunnel ID (optional if only 1 tunnel is running)
    pub target: Option<String>,
}

#[derive(Args, Debug, Clone)]
pub struct OpenArgs {
    /// Target port or tunnel ID (optional if only 1 tunnel is running)
    pub target: Option<String>,
}

#[derive(Args, Debug, Clone)]
pub struct ReplayArgs {
    /// Request ID to replay (from `proxync logs` or traffic inspector)
    pub id: String,

    /// Target port override (default: port originally captured in request log)
    #[arg(short, long)]
    pub port: Option<u16>,
}

#[derive(Args, Debug, Clone)]
pub struct CompletionArgs {
    /// Target shell to generate completions for
    #[arg(value_enum)]
    pub shell: clap_complete::Shell,
}

#[derive(Args, Debug, Clone)]
pub struct UpdateArgs {
    /// Only check for updates without downloading or installing
    #[arg(long)]
    pub check: bool,

    /// Force re-installation of the latest release even if current version matches
    #[arg(short, long)]
    pub force: bool,
}

#[derive(Args, Debug, Clone)]
pub struct ScanArgs {
    /// Output raw JSON instead of the formatted table
    #[arg(long)]
    pub json: bool,

    /// Bypass process cache and force a deep system scan
    #[arg(short, long)]
    pub force: bool,
}

#[derive(ValueEnum, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Provider {
    /// Direct SSH reverse tunnel to Proxync edge with auto-generated secure subdomain (default)
    Native,
    /// Fast public tunnel via Cloudflare Quick Tunnels (zero sign-up)
    Cloudflare,
    /// Proxync self-hosted WebSocket relay
    Relay,
}

#[derive(Args, Debug, Clone)]
pub struct DoctorArgs {
    /// Show detailed system, kernel, and toolchain info
    #[arg(short, long)]
    pub verbose: bool,
}

#[derive(Args, Debug, Clone)]
pub struct TunnelArgs {
    /// Local port to expose (e.g., 3000, 5173, 8080)
    pub port: u16,

    /// Tunnel provider to use: 'native' (default, SSH edge tunnel), 'cloudflare' (zero-config public URL), 'relay' (self-hosted ws)
    #[arg(short, long, value_enum, default_value_t = Provider::Native)]
    pub provider: Provider,

    /// Run in detached/quiet mode: suppress live terminal traffic while saving all logs to cli.log (like docker compose up -d)
    #[arg(short = 'd', long = "detach", visible_alias = "quiet", short_alias = 'q')]
    pub detach: bool,

    /// Display QR code in terminal upon tunnel launch
    #[arg(long)]
    pub qr: bool,

    /// Protect the public tunnel with HTTP Basic Auth (format: user:password)
    #[arg(long, value_name = "USER:PASS", env = "PROXYNC_BASIC_AUTH")]
    pub basic_auth: Option<String>,

    /// Auto-close tunnel after duration (e.g. 30m, 1h, 2h)
    #[arg(long, value_name = "DURATION")]
    pub expires: Option<String>,

    /// Bypass pre-flight port check (force tunnel launch even if server is offline)
    #[arg(long)]
    pub force: bool,

    /// Tunnel token (for relay provider)
    #[arg(long)]
    pub token: Option<String>,

    /// Workspace ID (for relay provider)
    #[arg(long)]
    pub workspace: Option<String>,

    /// Relay server WebSocket URL
    #[arg(long)]
    pub relay_url: Option<String>,

    /// Disable persisting session traffic to cli.log
    #[arg(long)]
    pub no_log: bool,

    /// Internal flag for background daemon worker process
    #[arg(long, hide = true)]
    pub daemon_worker: bool,
}

#[derive(Args, Debug, Clone)]
pub struct ProxyArgs {
    /// Target local port to intercept (e.g. 3000, 8080)
    pub port: u16,

    /// Run in detached/quiet mode: suppress live terminal traffic while saving all logs to cli.log (like docker compose up -d)
    #[arg(short = 'd', long = "detach", visible_alias = "quiet", short_alias = 'q')]
    pub detach: bool,

    /// Disable persisting session traffic to cli.log
    #[arg(long)]
    pub no_log: bool,
}

#[derive(Args, Debug, Clone)]
pub struct ServeArgs {
    /// Directory path to serve (default: current directory ".")
    #[arg(default_value = ".")]
    pub path: String,

    /// Local port to bind static server (0 = auto-assign ephemeral port)
    #[arg(long, default_value_t = 0)]
    pub port: u16,

    /// Tunnel provider to use: 'native' (default, SSH edge tunnel), 'cloudflare' (zero-config public URL), 'relay' (self-hosted ws)
    #[arg(short, long, value_enum, default_value_t = Provider::Native)]
    pub provider: Provider,

    /// Run in detached/quiet mode: suppress live terminal traffic while saving all logs to cli.log
    #[arg(short = 'd', long = "detach", visible_alias = "quiet", short_alias = 'q')]
    pub detach: bool,

    /// Display QR code in terminal upon tunnel launch
    #[arg(long)]
    pub qr: bool,

    /// Protect the public tunnel with HTTP Basic Auth (format: user:password)
    #[arg(long, value_name = "USER:PASS", env = "PROXYNC_BASIC_AUTH")]
    pub basic_auth: Option<String>,

    /// Auto-close tunnel after duration (e.g. 30m, 1h, 2h)
    #[arg(long, value_name = "DURATION")]
    pub expires: Option<String>,

    /// Bypass directory and file size caps (for intentional large file hosting)
    #[arg(long)]
    pub allow_large: bool,

    /// Disable persisting session traffic to cli.log
    #[arg(long)]
    pub no_log: bool,
}

#[derive(Args, Debug, Clone)]
pub struct LogsArgs {
    /// Number of lines to display (default: 50)
    #[arg(short = 'n', long, default_value_t = 50)]
    pub lines: usize,

    /// Stream/follow live log updates in real-time (like tail -f)
    #[arg(short = 'f', long = "follow", visible_alias = "tail")]
    pub follow: bool,

    /// Filter logs by keyword or pattern (e.g. --grep "/api/todos" or --grep "status=500")
    #[arg(long, value_name = "PATTERN")]
    pub grep: Option<String>,

    /// Clear all CLI session logs
    #[arg(long)]
    pub clear: bool,
}

pub fn preprocess_cli_args(raw_args: Vec<String>) -> Vec<String> {
    let mut args = raw_args;
    let known_subcommands = [
        "scan", "ls", "tunnel", "share", "inspect", "proxy", 
        "serve", "ps", "list", "stop", "status", "open", 
        "logs", "doctor", "diag", "providers", "provider", "gui", 
        "install", "setup-path", "upgrade", "update", "replay", "completion", "help"
    ];

    let has_subcommand = args.iter().skip(1).any(|a| known_subcommands.contains(&a.as_str()));

    if !has_subcommand && args.len() > 1 {
        // Check if any argument is a port number (handles 'proxync 3000', 'proxync -d 3000', 'proxync 3000 --help')
        let port_arg = args.iter().skip(1).find(|a| !a.starts_with('-') && a.parse::<u16>().is_ok());
        if port_arg.is_some() {
            args.insert(1, "tunnel".to_string());
        } else {
            let is_help_or_version = args.iter().skip(1).any(|a| a == "-h" || a == "--help" || a == "-V" || a == "--version");
            if !is_help_or_version {
                // Check if any non-flag argument is an existing directory path or path-like (handles 'proxync ./dist', 'proxync -d ./dist', 'proxync ./missing')
                let path_arg = args.iter().skip(1).find(|a| {
                    !a.starts_with('-')
                        && (std::path::Path::new(a.as_str()).exists()
                            || a.starts_with("./")
                            || a.starts_with(".\\")
                            || a.contains('/')
                            || a.contains('\\'))
                });
                if path_arg.is_some() {
                    args.insert(1, "serve".to_string());
                }
            }
        }
    }
    args
}
