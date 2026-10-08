use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::events::{EventSender, ProxyncEvent};
use base64::prelude::*;

lazy_static! {
    static ref PROXY_HANDLES: Arc<Mutex<HashMap<u16, (u16, Vec<tokio::task::JoinHandle<()>>)>>> = Arc::new(Mutex::new(HashMap::new()));
}

pub async fn stop_proxy(local_port: Option<u16>) -> bool {
    let mut proxies = PROXY_HANDLES.lock().await;
    if let Some(port) = local_port {
        if let Some((_proxy_port, handles)) = proxies.remove(&port) {
            for handle in handles {
                handle.abort();
            }
            return true;
        }
    } else {
        if !proxies.is_empty() {
            for (_, (_proxy_port, handles)) in proxies.drain() {
                for handle in handles {
                    handle.abort();
                }
            }
            return true;
        }
    }
    false
}

// ponytail: 50 MB upload cap — prevents OOM on large multipart uploads over public tunnels.
// Upgrade path: make configurable via AppSettings if users request larger limits.
const MAX_UPLOAD_BODY_BYTES: usize = 50 * 1024 * 1024; // 50 MB

/// Validates and parses Basic Auth credentials in "username:password" format.
/// In accordance with RFC 7617, the username must not contain unescaped colons.
/// Splits strictly on the first colon (.split_once(':')) so passwords can contain colons.
pub fn parse_basic_auth_credentials(cred: &str) -> Result<(String, String), String> {
    let trimmed = cred.trim();
    let (username, password) = trimmed
        .split_once(':')
        .ok_or_else(|| "Invalid basic auth format: missing colon separator between username and password".to_string())?;

    let username = username.trim();
    if username.is_empty() {
        return Err("Basic auth username cannot be empty".to_string());
    }
    if username.contains(':') {
        return Err("Basic auth username cannot contain colons".to_string());
    }

    Ok((username.to_string(), password.to_string()))
}

/// Compares two byte slices in constant time to prevent side-channel timing attacks.
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Extracts the client IP address from proxy forwarding headers (X-Forwarded-For, CF-Connecting-IP, X-Real-IP)
/// or falls back to the peer socket IP.
pub fn extract_client_ip(header_str: &str, peer_ip: &str) -> String {
    for line in header_str.lines() {
        let trimmed = line.trim();
        let lower = trimmed.to_ascii_lowercase();
        if lower.starts_with("x-forwarded-for:") || lower.starts_with("cf-connecting-ip:") || lower.starts_with("x-real-ip:") {
            if let Some((_, val)) = trimmed.split_once(':') {
                let first_ip = val.split(',').next().unwrap_or("").trim();
                if !first_ip.is_empty() {
                    return first_ip.to_string();
                }
            }
        }
    }
    peer_ip.to_string()
}

/// Checks whether an HTTP Authorization header is present in the request headers.
pub fn has_authorization_header(header_str: &str) -> bool {
    header_str.lines().any(|l| {
        l.trim().to_ascii_lowercase().starts_with("authorization:")
    })
}

#[derive(Debug, Clone)]
pub struct FailedAttemptEntry {
    pub attempts: u32,
    pub window_start: std::time::Instant,
    pub last_attempt: std::time::Instant,
    pub locked_until: Option<std::time::Instant>,
    pub lockout_tier: u32,
}

pub const MAX_FAILED_AUTH_ATTEMPTS: u32 = 5;
pub const AUTH_WINDOW_SECS: u64 = 60;
pub const AUTH_IDLE_RESET_SECS: u64 = 900; // 15 minutes of inactivity resets tier back to 0
pub const LOCKOUT_DURATIONS: [u64; 5] = [60, 120, 300, 900, 3600]; // 1m, 2m, 5m, 15m, 1h max

/// Android-style progressive lockout: returns escalation duration in seconds based on stage.
pub fn get_lockout_duration_secs(tier: u32) -> u64 {
    let idx = (tier.saturating_sub(1) as usize).min(LOCKOUT_DURATIONS.len() - 1);
    LOCKOUT_DURATIONS[idx]
}

/// Formats seconds into human-readable duration string (e.g. "5m 00s", "1h 15m 00s", "45s").
pub fn format_lockout_duration(secs: u64) -> String {
    if secs >= 3600 {
        let h = secs / 3600;
        let m = (secs % 3600) / 60;
        let s = secs % 60;
        format!("{}h {}m {:02}s", h, m, s)
    } else if secs >= 60 {
        let m = secs / 60;
        let s = secs % 60;
        format!("{}m {:02}s", m, s)
    } else {
        format!("{}s", secs)
    }
}

#[cfg(not(test))]
pub const AUTH_FAILED_DELAY_MS: u64 = 1000;
#[cfg(test)]
pub const AUTH_FAILED_DELAY_MS: u64 = 5;

// ponytail: sliding window in-memory rate limiter per tunnel; prunes at 1000 IPs to prevent memory exhaustion
#[derive(Default)]
pub struct AuthRateLimiter {
    pub entries: HashMap<String, FailedAttemptEntry>,
}

impl AuthRateLimiter {
    pub fn new() -> Self {
        Self { entries: HashMap::new() }
    }

    /// Checks if a client IP is currently locked out.
    /// Returns Some((remaining_seconds, lockout_tier)) if locked, or None if unlocked.
    pub fn is_locked(&self, client_ip: &str, now: std::time::Instant) -> Option<(u64, u32)> {
        if let Some(entry) = self.entries.get(client_ip) {
            if let Some(locked_until) = entry.locked_until {
                if now < locked_until {
                    let remaining = locked_until.duration_since(now).as_secs().max(1);
                    return Some((remaining, entry.lockout_tier));
                }
            }
        }
        None
    }

    /// Records a failed authentication attempt with Android-style progressive escalation.
    /// Returns Some((lockout_seconds, lockout_tier)) if this attempt triggered/escalated a lockout, or None if still under limit.
    pub fn record_failure(&mut self, client_ip: &str, now: std::time::Instant) -> Option<(u64, u32)> {
        if self.entries.len() > 1000 {
            self.entries.retain(|_, v| {
                if let Some(l) = v.locked_until {
                    if now < l {
                        return true;
                    }
                    return now.duration_since(l).as_secs() < AUTH_IDLE_RESET_SECS;
                }
                if v.lockout_tier > 0 {
                    return now.duration_since(v.last_attempt).as_secs() < AUTH_IDLE_RESET_SECS;
                }
                now.duration_since(v.window_start).as_secs() < AUTH_WINDOW_SECS
            });
        }

        let entry = self.entries.entry(client_ip.to_string()).or_insert_with(|| FailedAttemptEntry {
            attempts: 0,
            window_start: now,
            last_attempt: now,
            locked_until: None,
            lockout_tier: 0,
        });

        // Check idle reset: if client was inactive for > AUTH_IDLE_RESET_SECS since last attempt or expiry, reset tier
        let is_idle_expired = match entry.locked_until {
            Some(exp) if now >= exp => now.duration_since(exp).as_secs() > AUTH_IDLE_RESET_SECS,
            None => now.duration_since(entry.last_attempt).as_secs() > AUTH_IDLE_RESET_SECS,
            _ => false,
        };

        if is_idle_expired {
            entry.attempts = 0;
            entry.window_start = now;
            entry.locked_until = None;
            entry.lockout_tier = 0;
        }

        // If an existing lockout has finished, clear locked_until
        if let Some(exp) = entry.locked_until {
            if now >= exp {
                entry.locked_until = None;
            }
        }

        entry.last_attempt = now;

        // If already in a lockout tier (tier >= 1), any subsequent wrong attempt immediately escalates tier
        if entry.lockout_tier >= 1 {
            entry.lockout_tier += 1;
            let duration = get_lockout_duration_secs(entry.lockout_tier);
            entry.locked_until = Some(now + std::time::Duration::from_secs(duration));
            Some((duration, entry.lockout_tier))
        } else {
            // First tier (tier == 0): check sliding window
            if now.duration_since(entry.window_start).as_secs() > AUTH_WINDOW_SECS {
                entry.attempts = 0;
                entry.window_start = now;
            }
            entry.attempts += 1;
            if entry.attempts >= MAX_FAILED_AUTH_ATTEMPTS {
                entry.lockout_tier = 1;
                let duration = get_lockout_duration_secs(1);
                entry.locked_until = Some(now + std::time::Duration::from_secs(duration));
                Some((duration, 1))
            } else {
                None
            }
        }
    }

    pub fn record_success(&mut self, client_ip: &str) {
        self.entries.remove(client_ip);
    }
}

async fn serve_401_unauthorized(client_stream: &mut TcpStream, local_port: u16) {
    let html_401 = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>401 - Access Restricted | Proxync Tunnel</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060e20; color: #dae2fd; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box;">
  <div style="text-align: center; max-width: 480px; width: 100%; padding: 40px 32px; background: #0b1326; border-radius: 20px; border: 1px solid #222a3d; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); position: relative; overflow: hidden;">
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #8aebff, transparent);"></div>
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; background: rgba(252, 211, 77, 0.1); border: 1px solid rgba(252, 211, 77, 0.25); color: #fcd34d; font-size: 12px; font-weight: 600; font-family: monospace; margin-bottom: 20px;">
      <span style="width: 8px; height: 8px; background: #fcd34d; border-radius: 50%; box-shadow: 0 0 8px #fcd34d;"></span>
      🔒 401 • AUTHENTICATION REQUIRED
    </div>
    <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Access <span style="color: #8aebff;">Restricted</span></h2>
    <p style="color: #8b96ad; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">This Proxync tunnel is password-protected. Valid HTTP Basic Authentication credentials are required to access local service on <span style="background: #131b2e; padding: 2px 8px; border-radius: 6px; color: #8aebff; font-family: monospace; font-weight: 600;">port {}</span>.</p>
    <button onclick="window.location.reload()" style="display: block; width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #8aebff 0%, #22d3ee 100%); color: #00363e; font-weight: 700; font-size: 14px; border-radius: 12px; border: none; cursor: pointer; text-decoration: none; box-shadow: 0 8px 24px -6px rgba(34, 211, 238, 0.5);">Sign In Again</button>
    <div style="margin-top: 24px; font-size: 12px; color: #64748b;">
      <a href="https://proxync.dev" style="color: #8b96ad; text-decoration: none;">Proxync Tunnel</a> • Ephemeral Zero-Trust Security Gate
    </div>
  </div>
</body>
</html>"#,
        local_port
    );
    let resp = format!(
        "HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"Proxync Tunnel\"\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html_401.len(),
        html_401
    );
    let _ = client_stream.write_all(resp.as_bytes()).await;
    let _ = client_stream.shutdown().await;
}

async fn serve_429_lockout(client_stream: &mut TcpStream, remaining_secs: u64, lockout_tier: u32, local_port: u16) {
    let badge_text = if lockout_tier > 1 {
        format!("⛔ 429 • EXTENDED LOCKOUT (STAGE {})", lockout_tier)
    } else {
        "⛔ 429 • TOO MANY ATTEMPTS".to_string()
    };

    let desc_text = if lockout_tier > 1 {
        format!(
            "Repeated failed attempts detected for local service on <span style=\"background: #131b2e; padding: 2px 8px; border-radius: 6px; color: #8aebff; font-family: monospace; font-weight: 600;\">port {}</span>. Lockout penalty escalated to Stage {} ({}).",
            local_port, lockout_tier, format_lockout_duration(remaining_secs)
        )
    } else {
        format!(
            "Too many failed authentication attempts for local service on <span style=\"background: #131b2e; padding: 2px 8px; border-radius: 6px; color: #8aebff; font-family: monospace; font-weight: 600;\">port {}</span>. Access is temporarily locked to prevent brute-force attacks.",
            local_port
        )
    };

    let formatted_remaining = format_lockout_duration(remaining_secs);

    let html_429 = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>429 - Authentication Locked | Proxync Tunnel</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #060e20; color: #dae2fd; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box;">
  <div style="text-align: center; max-width: 480px; width: 100%; padding: 40px 32px; background: #0b1326; border-radius: 20px; border: 1px solid #3b1d28; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); position: relative; overflow: hidden;">
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #ff5449, transparent);"></div>
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 84, 73, 0.12); border: 1px solid rgba(255, 84, 73, 0.3); color: #ff897d; font-size: 12px; font-weight: 600; font-family: monospace; margin-bottom: 20px;">
      <span style="width: 8px; height: 8px; background: #ff5449; border-radius: 50%; box-shadow: 0 0 8px #ff5449;"></span>
      {badge_text}
    </div>
    <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Authentication <span style="color: #ff897d;">Locked</span></h2>
    <p style="color: #8b96ad; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">{desc_text}</p>
    <div style="background: #140d18; border: 1px solid #3b1d28; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #8b96ad; font-size: 13px;">Lockout expires in:</span>
        <span id="countdown" style="color: #ff897d; font-family: monospace; font-weight: 700; font-size: 18px;">{formatted_remaining}</span>
      </div>
      <div style="background: rgba(255, 84, 73, 0.15); height: 4px; border-radius: 9999px; overflow: hidden;">
        <div id="progress" style="width: 100%; height: 100%; background: #ff5449; transition: width 1s linear;"></div>
      </div>
    </div>
    <button id="retryBtn" onclick="window.location.reload()" style="display: block; width: 100%; padding: 12px 20px; background: #222a3d; color: #dae2fd; font-weight: 700; font-size: 14px; border-radius: 12px; border: 1px solid #36415a; cursor: pointer; text-decoration: none; transition: all 0.3s ease;">Retry Now</button>
    <div style="margin-top: 24px; font-size: 12px; color: #64748b;">
      <a href="https://proxync.dev" style="color: #8b96ad; text-decoration: none;">Proxync Tunnel</a> • Ephemeral Zero-Trust Security Gate
    </div>
  </div>
  <script>
    (function() {{
      var remaining = {remaining_secs};
      var initial = Math.max(remaining, 1);
      var timerEl = document.getElementById('countdown');
      var progressEl = document.getElementById('progress');
      var retryBtn = document.getElementById('retryBtn');

      function formatTime(s) {{
        if (s >= 3600) {{
          var h = Math.floor(s / 3600);
          var m = Math.floor((s % 3600) / 60);
          var sec = s % 60;
          return h + 'h ' + m + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
        }} else if (s >= 60) {{
          var m = Math.floor(s / 60);
          var sec = s % 60;
          return m + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
        }}
        return s + 's';
      }}

      var interval = setInterval(function() {{
        remaining--;
        if (remaining <= 0) {{
          clearInterval(interval);
          if (timerEl) timerEl.textContent = '0s (Unlocked)';
          if (progressEl) progressEl.style.width = '0%';
          if (retryBtn) {{
            retryBtn.style.background = 'linear-gradient(135deg, #8aebff 0%, #22d3ee 100%)';
            retryBtn.style.color = '#00363e';
            retryBtn.style.borderColor = 'transparent';
            retryBtn.style.boxShadow = '0 8px 24px -6px rgba(34, 211, 238, 0.5)';
            retryBtn.textContent = 'Try Again Now';
          }}
          setTimeout(function() {{ window.location.reload(); }}, 800);
        }} else {{
          if (timerEl) timerEl.textContent = formatTime(remaining);
          if (progressEl) progressEl.style.width = ((remaining / initial) * 100) + '%';
        }}
      }}, 1000);
    }})();
  </script>
</body>
</html>"#,
        remaining_secs = remaining_secs,
        formatted_remaining = formatted_remaining,
        badge_text = badge_text,
        desc_text = desc_text
    );
    let resp = format!(
        "HTTP/1.1 429 Too Many Requests\r\nRetry-After: {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        remaining_secs,
        html_429.len(),
        html_429
    );
    let _ = client_stream.write_all(resp.as_bytes()).await;
    let _ = client_stream.shutdown().await;
}

/// Extracts the HTTP Authorization header from raw header string and verifies against expected Basic Auth credentials.
/// Handles base64 decoding, splits only on the first colon, and checks username & password using constant-time comparison.
pub fn verify_basic_auth(header_str: &str, expected_user: &str, expected_pass: &str) -> bool {
    for line in header_str.lines() {
        let trimmed = line.trim();
        if trimmed.to_ascii_lowercase().starts_with("authorization:") {
            if let Some((_, val)) = trimmed.split_once(':') {
                let auth_val = val.trim();
                if let Some(token) = auth_val.strip_prefix("Basic ").or_else(|| auth_val.strip_prefix("basic ")) {
                    if let Ok(decoded_bytes) = BASE64_STANDARD.decode(token.trim()) {
                        if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                            if let Some((user, pass)) = decoded_str.split_once(':') {
                                if constant_time_eq(user.as_bytes(), expected_user.as_bytes())
                                    && constant_time_eq(pass.as_bytes(), expected_pass.as_bytes())
                                {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    false
}

pub async fn start_proxy(tx: EventSender, local_port: u16) -> Result<u16, String> {
    start_proxy_with_auth(tx, local_port, None).await
}

pub async fn start_proxy_with_auth(
    tx: EventSender,
    local_port: u16,
    basic_auth: Option<String>,
) -> Result<u16, String> {
    let mut map = PROXY_HANDLES.lock().await;
    if let Some((_, old_handles)) = map.remove(&local_port) {
        for handle in old_handles {
            handle.abort();
        }
    }

    let auth_expected: Option<Arc<(String, String)>> = match basic_auth {
        Some(cred) if !cred.trim().is_empty() => {
            let (u, p) = parse_basic_auth_credentials(&cred)?;
            Some(Arc::new((u, p)))
        }
        _ => None,
    };

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let proxy_port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let rate_limiter = Arc::new(Mutex::new(AuthRateLimiter::new()));

    let proxy_tx = tx.clone();
    let listener_handle = tokio::spawn(async move {
        while let Ok((mut client_stream, peer_addr)) = listener.accept().await {
            let tx_clone = proxy_tx.clone();
            let auth_clone = auth_expected.clone();
            let rate_limiter_clone = rate_limiter.clone();
            let peer_ip = peer_addr.ip().to_string();
            tokio::spawn(async move {
                // ponytail: dynamic header reading until \r\n\r\n delimiter; 2 MB safety cap prevents memory DoS
                const MAX_HEADER_BYTES: usize = 2 * 1024 * 1024; // 2 MB
                let mut req_buf = Vec::with_capacity(8192);
                let mut chunk = [0u8; 8192];
                let mut header_end: Option<usize> = None;

                loop {
                    let n = match client_stream.read(&mut chunk).await {
                        Ok(bytes) if bytes > 0 => bytes,
                        _ => break,
                    };
                    req_buf.extend_from_slice(&chunk[..n]);

                    if let Some(pos) = req_buf.windows(4).position(|w| w == b"\r\n\r\n") {
                        header_end = Some(pos + 4);
                        break;
                    }

                    if req_buf.len() > MAX_HEADER_BYTES {
                        let resp = "HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n";
                        let _ = client_stream.write_all(resp.as_bytes()).await;
                        let _ = client_stream.shutdown().await;
                        return;
                    }
                }

                let header_end_pos = match header_end {
                    Some(pos) => pos,
                    None => return, // Delimiter \r\n\r\n never arrived before EOF
                };

                let header_str = String::from_utf8_lossy(&req_buf[..header_end_pos]);

                // Basic Auth verification if configured (checked before probing backend service to prevent port/health leakage)
                if let Some(ref expected) = auth_clone {
                    let client_ip = extract_client_ip(&header_str, &peer_ip);
                    let now = std::time::Instant::now();

                    // Check if client IP is currently in active lockout
                    let locked_status = {
                        let lim = rate_limiter_clone.lock().await;
                        lim.is_locked(&client_ip, now)
                    };
                    if let Some((remaining_secs, tier)) = locked_status {
                        serve_429_lockout(&mut client_stream, remaining_secs, tier, local_port).await;
                        return;
                    }

                    let has_auth = has_authorization_header(&header_str);
                    let is_valid = verify_basic_auth(&header_str, &expected.0, &expected.1);

                    if is_valid {
                        let mut lim = rate_limiter_clone.lock().await;
                        lim.record_success(&client_ip);
                    } else {
                        if has_auth {
                            // Invalid credentials submitted -> increment failure count & tarpit delay
                            let locked_info = {
                                let mut lim = rate_limiter_clone.lock().await;
                                lim.record_failure(&client_ip, now)
                            };

                            // Tarpit delay to slow down automated brute-force attempts
                            tokio::time::sleep(std::time::Duration::from_millis(AUTH_FAILED_DELAY_MS)).await;

                            if let Some((lockout_secs, tier)) = locked_info {
                                serve_429_lockout(&mut client_stream, lockout_secs, tier, local_port).await;
                            } else {
                                serve_401_unauthorized(&mut client_stream, local_port).await;
                            }
                        } else {
                            // Initial visit without credentials -> challenge with standard 401 (no failure count, no delay)
                            serve_401_unauthorized(&mut client_stream, local_port).await;
                        }
                        return;
                    }
                }

                // Connect to target service on 127.0.0.1 with fallback to [::1] (for IPv6-only servers like Vite)
                let target_stream_res = match TcpStream::connect(format!("127.0.0.1:{}", local_port)).await {
                    Ok(s) => Ok(s),
                    Err(_) => TcpStream::connect(format!("[::1]:{}", local_port)).await,
                };
                let mut target_stream = match target_stream_res {
                    Ok(stream) => stream,
                    Err(_) => {
                        // Target server is offline / restarting: serve branded 502 Bad Gateway standby page
                        let html_body = format!(
                            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>502 - Target Server Offline | Proxync</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
  <div style="text-align: center; max-width: 480px; width: 100%; padding: 36px 28px; background: #151d2f; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="font-size: 36px; margin-bottom: 12px;">🟡</div>
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">Local Service Offline</h2>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">Proxync public tunnel is <b style="color: #f8fafc;">active</b> in standby mode. Waiting for your local server on <span style="background:#1e293b; padding:2px 8px; border-radius:4px; color:#38bdf8; font-family:monospace; font-weight:600;">port {}</span> to respond.</p>
    <p style="color: #64748b; font-size: 12px; margin: 0;">Start or restart your local development server to resume live traffic on this URL.</p>
  </div>
</body>
</html>"#,
                            local_port
                        );
                        let resp = format!(
                            "HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            html_body.len(),
                            html_body
                        );
                        let _ = client_stream.write_all(resp.as_bytes()).await;
                        let _ = client_stream.shutdown().await;
                        return;
                    }
                };

                // 1. Detect WebSocket Upgrade requests (Vite HMR, Next Turbopack, Socket.io, NestJS, etc.)
                let is_ws_upgrade = header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("upgrade:") && ll.contains("websocket")
                }) || header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("connection:") && ll.contains("upgrade")
                });

                // 2. Detect SSE (Server-Sent Events) streams
                let is_sse = header_str.lines().any(|l| {
                    let ll = l.to_lowercase();
                    ll.starts_with("accept:") && ll.contains("text/event-stream")
                });

                // 3. Enforce upload size cap (50 MB)
                let mut content_length: usize = 0;
                for line in header_str.lines() {
                    let lower = line.to_lowercase();
                    if lower.starts_with("content-length:") {
                        if let Some((_, val)) = line.split_once(':') {
                            if let Ok(len) = val.trim().parse::<usize>() {
                                content_length = len;
                            }
                        }
                    }
                }
                if content_length > MAX_UPLOAD_BODY_BYTES {
                    let err_json = "{\"error\":\"Upload limit exceeded. Proxync limits uploads to 50 MB per request.\"}";
                    let resp = format!(
                        "HTTP/1.1 413 Payload Too Large\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        err_json.len(),
                        err_json
                    );
                    let _ = client_stream.write_all(resp.as_bytes()).await;
                    let _ = client_stream.shutdown().await;
                    return;
                }

                // 4. Header normalization & forwarding headers injection
                let mut incoming_host = String::new();
                let mut modified_headers = Vec::new();
                let mut safe_headers = HashMap::new();
                let mut method = "GET".to_string();
                let mut path = "/".to_string();

                for (idx, line) in header_str.lines().enumerate() {
                    if idx == 0 {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            method = parts[0].to_string();
                            path = parts[1].to_string();
                        }
                        modified_headers.push(line.to_string());
                        continue;
                    }
                    if let Some((k, v)) = line.split_once(':') {
                        let key = k.trim();
                        let val = v.trim();
                        let lower_key = key.to_lowercase();
                        if lower_key == "host" {
                            incoming_host = val.to_string();
                            modified_headers.push(format!("Host: localhost:{}", local_port));
                        } else if lower_key == "origin" {
                            // Rewrite Origin to match local dev server host so WebSocket origin checks pass
                            modified_headers.push(format!("Origin: http://localhost:{}", local_port));
                        } else if is_ws_upgrade && (lower_key == "connection" || lower_key == "upgrade" || lower_key.starts_with("sec-websocket-")) {
                            // Preserve WebSocket headers verbatim
                            modified_headers.push(line.to_string());
                        } else if !is_ws_upgrade && !is_sse && lower_key == "connection" {
                            modified_headers.push("Connection: close".to_string());
                        } else {
                            modified_headers.push(line.to_string());
                        }

                        let display_val = if lower_key == "authorization" || lower_key == "cookie" || lower_key == "set-cookie" || lower_key == "x-api-key" || lower_key == "api-key" {
                            "[REDACTED]".to_string()
                        } else {
                            val.to_string()
                        };
                        safe_headers.insert(key.to_string(), display_val);
                    }
                }

                // Inject Forwarded headers for reverse proxying
                modified_headers.push("X-Forwarded-Proto: https".to_string());
                modified_headers.push("X-Forwarded-For: 127.0.0.1".to_string());
                if !incoming_host.is_empty() {
                    modified_headers.push(format!("X-Forwarded-Host: {}", incoming_host));
                }
                if !is_ws_upgrade && !is_sse && !modified_headers.iter().any(|h| h.to_lowercase().starts_with("connection:")) {
                    modified_headers.push("Connection: close".to_string());
                }

                let modified_headers_str = format!("{}\r\n\r\n", modified_headers.join("\r\n"));
                let body_bytes = &req_buf[header_end_pos..];

                let req_id = format!("req-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
                let body_preview = String::from_utf8_lossy(&body_bytes[..body_bytes.len().min(4096)]).trim().to_string();

                let _ = tx_clone.send(ProxyncEvent::RequestLog {
                    id: req_id.clone(),
                    method: method.clone(),
                    path: path.clone(),
                    port: local_port,
                    headers: serde_json::json!(safe_headers),
                    body_preview,
                    tunnel_id: None,
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                });

                let start_instant = std::time::Instant::now();

                if target_stream.write_all(modified_headers_str.as_bytes()).await.is_err() {
                    return;
                }
                if !body_bytes.is_empty() {
                    if target_stream.write_all(body_bytes).await.is_err() {
                        return;
                    }
                }

                // Read initial response chunk to capture HTTP status code and latency duration
                let mut res_buf = vec![0u8; 16384];
                let mut n_res = match target_stream.read(&mut res_buf).await {
                    Ok(bytes) if bytes > 0 => bytes,
                    _ => return,
                };

                // ponytail: if headers were flushed in first TCP segment (e.g. Next.js/Node chunked encoding),
                // read the initial body segment into the buffer so responseBodyPreview is captured for schema drift.
                // BODY_CHUNK_TIMEOUT_MS: chosen to be > a Node.js event-loop tick (~16 ms) but imperceptible to the user.
                // Upgrade path: expose via AppSettings if users need tuning.
                const BODY_CHUNK_TIMEOUT_MS: u64 = 150;
                if !is_ws_upgrade && !is_sse {
                    if let Some(pos) = res_buf[..n_res].windows(4).position(|w| w == b"\r\n\r\n") {
                        let header_end = pos + 4;
                        if header_end == n_res && n_res < res_buf.len() {
                            if let Ok(Ok(extra)) = tokio::time::timeout(
                                std::time::Duration::from_millis(BODY_CHUNK_TIMEOUT_MS),
                                target_stream.read(&mut res_buf[n_res..]),
                            ).await {
                                n_res += extra;
                            }
                        }
                    }
                }

                let duration_ms = start_instant.elapsed().as_millis() as u64;
                let res_str = String::from_utf8_lossy(&res_buf[..n_res]);
                let mut status: u16 = 200;
                if let Some(status_line) = res_str.lines().next() {
                    let parts: Vec<&str> = status_line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(code) = parts[1].parse::<u16>() {
                            status = code;
                        }
                    }
                }

                // ── Response Body Preview Extraction (Schema Drift Engine) ──────────────────
                // ponytail: 4 KB IPC cap — high-frequency Tauri events; upgrade path: expose
                // cap as configurable AppSettings field if users need larger previews.
                const RESP_BODY_PREVIEW_BYTES: usize = 4096;

                let (response_headers_map, response_body_preview): (serde_json::Value, Option<String>) = {
                    if is_ws_upgrade || is_sse {
                        // Never capture streaming protocols — bidirectional relay follows immediately
                        (serde_json::json!({}), None)
                    } else {
                        let header_body_parts: Vec<&str> = res_str.splitn(2, "\r\n\r\n").collect();
                        let resp_header_section = header_body_parts.get(0).copied().unwrap_or("");
                        let resp_body_section   = header_body_parts.get(1).copied().unwrap_or("");

                        // Parse response headers into a JSON map (skip status line at index 0)
                        let mut resp_hdrs = serde_json::Map::new();
                        let mut content_type_val = String::new();
                        let mut content_encoding_val = String::new();
                        for line in resp_header_section.lines().skip(1) {
                            if let Some((k, v)) = line.split_once(':') {
                                let key_lc = k.trim().to_lowercase();
                                let val    = v.trim().to_string();
                                if key_lc == "content-type" { content_type_val = val.clone(); }
                                if key_lc == "content-encoding" { content_encoding_val = val.clone(); }
                                resp_hdrs.insert(k.trim().to_string(), serde_json::Value::String(val));
                            }
                        }

                        // Only capture body preview for JSON and when not compressed with gzip/br/deflate
                        let is_json = content_type_val.to_lowercase().contains("json");
                        let is_compressed = !content_encoding_val.is_empty() && content_encoding_val != "identity";

                        let body_preview = if is_json && !is_compressed && !resp_body_section.is_empty() {
                            let preview: String = resp_body_section
                                .trim()
                                .chars()
                                .take(RESP_BODY_PREVIEW_BYTES)
                                .collect();
                            if preview.is_empty() { None } else { Some(preview) }
                        } else {
                            None
                        };

                        (serde_json::Value::Object(resp_hdrs), body_preview)
                    }
                };

                let _ = tx_clone.send(ProxyncEvent::ResponseLog {
                    id: req_id.clone(),
                    request_id: req_id.clone(),
                    status,
                    duration_ms,
                    response_headers: response_headers_map,
                    response_body_preview,
                    timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                });

                if client_stream.write_all(&res_buf[..n_res]).await.is_err() {
                    return;
                }

                // Full-duplex bidirectional stream for remaining traffic (WebSocket HMR, HTTP/1.1 chunked, SSE, uploads)
                let _ = tokio::io::copy_bidirectional(&mut client_stream, &mut target_stream).await;
            });
        }
    });

    let liveness_tx = tx.clone();
    let liveness_handle = tokio::spawn(async move {
        // Initial pause before first probe
        tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
        let mut last_status = "ACTIVE";
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

            let is_v4 = tokio::time::timeout(
                tokio::time::Duration::from_millis(250),
                TcpStream::connect(format!("127.0.0.1:{}", local_port)),
            )
            .await
            .map(|r| r.is_ok())
            .unwrap_or(false);

            let is_alive = if is_v4 {
                true
            } else {
                tokio::time::timeout(
                    tokio::time::Duration::from_millis(250),
                    TcpStream::connect(format!("[::1]:{}", local_port)),
                )
                .await
                .map(|r| r.is_ok())
                .unwrap_or(false)
            };

            let new_status = if is_alive { "ACTIVE" } else { "STANDBY" };
            if new_status != last_status {
                last_status = new_status;
                let _ = liveness_tx.send(ProxyncEvent::TunnelStatusChanged {
                    port: local_port,
                    status: new_status.to_string(),
                });
            }
        }
    });

    map.insert(local_port, (proxy_port, vec![listener_handle, liveness_handle]));
    Ok(proxy_port)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::broadcast;

    fn test_event_sender() -> EventSender {
        let (tx, _rx) = broadcast::channel(16);
        tx
    }

    #[test]
    fn test_parse_basic_auth_credentials() {
        // Valid username and password
        let res = parse_basic_auth_credentials("alice:secret123");
        assert_eq!(res.unwrap(), ("alice".to_string(), "secret123".to_string()));

        // Password containing colons (split_once on first colon)
        let res = parse_basic_auth_credentials("bob:pass:word:with:colons");
        assert_eq!(res.unwrap(), ("bob".to_string(), "pass:word:with:colons".to_string()));

        // Missing colon
        assert!(parse_basic_auth_credentials("charlie").is_err());

        // Empty username
        assert!(parse_basic_auth_credentials(":password").is_err());
    }

    #[test]
    fn test_verify_basic_auth_logic() {
        let headers = "GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46c2VjcmV0MTIz\r\n\r\n";
        assert!(verify_basic_auth(headers, "admin", "secret123"));

        // Wrong password
        assert!(!verify_basic_auth(headers, "admin", "wrong"));

        // Wrong user
        assert!(!verify_basic_auth(headers, "user", "secret123"));

        // Missing auth header
        let no_auth = "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert!(!verify_basic_auth(no_auth, "admin", "secret123"));
    }

    #[tokio::test]
    async fn test_proxy_auth_flows() {
        // 1. Start mock target server
        let target_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_port = target_listener.local_addr().unwrap().port();

        tokio::spawn(async move {
            while let Ok((mut stream, _)) = target_listener.accept().await {
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 65536];
                    let _ = stream.read(&mut buf).await;
                    let resp = "HTTP/1.1 200 OK\r\nContent-Length: 5\r\nConnection: close\r\n\r\nHello";
                    let _ = stream.write_all(resp.as_bytes()).await;
                });
            }
        });

        // 2. Start proxy with auth "admin:pass123"
        let tx = test_event_sender();
        let proxy_port = start_proxy_with_auth(tx, target_port, Some("admin:pass123".to_string()))
            .await
            .unwrap();

        // 3. Request without auth -> 401 Unauthorized
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
            assert!(res_str.contains("WWW-Authenticate: Basic"));
            assert!(res_str.contains("text/html"));
            assert!(res_str.contains("Access"));
        }

        // 4. Request with invalid credentials -> 401 Unauthorized
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:wrong -> YWRtaW46d3Jvbmc=
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46d3Jvbmc=\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
        }

        // 5. Request with correct credentials -> 200 OK
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:pass123 -> YWRtaW46cGFzczEyMw==
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46cGFzczEyMw==\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("200 OK"));
            assert!(res_str.contains("Hello"));
        }

        // 6. Test large headers > 16 KB (Issue 2)
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            let large_cookie = "X-Large-Cookie: ".to_string() + &"a".repeat(20000) + "\r\n";
            let req = format!(
                "GET / HTTP/1.1\r\nHost: localhost\r\n{}Authorization: Basic YWRtaW46cGFzczEyMw==\r\n\r\n",
                large_cookie
            );
            stream.write_all(req.as_bytes()).await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("200 OK"));
        }

        stop_proxy(Some(target_port)).await;
    }

    #[tokio::test]
    async fn test_offline_target_does_not_leak_502_before_auth() {
        // Bind an unused port and immediately close it so target is offline
        let dummy = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let offline_port = dummy.local_addr().unwrap().port();
        drop(dummy);

        let tx = test_event_sender();
        let proxy_port = start_proxy_with_auth(tx, offline_port, Some("admin:secret".to_string()))
            .await
            .unwrap();

        // Unauthenticated client probing offline target -> must receive 401 Unauthorized, NOT 502!
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
            assert!(!res_str.contains("502 Bad Gateway"));
        }

        // Authenticated client probing offline target -> gets 502 Bad Gateway
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            // admin:secret -> YWRtaW46c2VjcmV0
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic YWRtaW46c2VjcmV0\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 1024];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("502 Bad Gateway"));
        }

        stop_proxy(Some(offline_port)).await;
    }

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq(b"password123", b"password123"));
        assert!(!constant_time_eq(b"password123", b"password124"));
        assert!(!constant_time_eq(b"password123", b"short"));
        assert!(!constant_time_eq(b"", b"nonempty"));
        assert!(constant_time_eq(b"", b""));
    }

    #[test]
    fn test_lockout_duration_formatting() {
        assert_eq!(format_lockout_duration(45), "45s");
        assert_eq!(format_lockout_duration(60), "1m 00s");
        assert_eq!(format_lockout_duration(120), "2m 00s");
        assert_eq!(format_lockout_duration(300), "5m 00s");
        assert_eq!(format_lockout_duration(900), "15m 00s");
        assert_eq!(format_lockout_duration(3665), "1h 1m 05s");
    }

    #[test]
    fn test_auth_rate_limiter_progressive_lockout_and_reset() {
        let mut limiter = AuthRateLimiter::new();
        let now = std::time::Instant::now();
        let ip = "192.168.1.50";

        // Attempts 1 to 4: no lockout
        for _ in 1..=4 {
            assert_eq!(limiter.record_failure(ip, now), None);
            assert_eq!(limiter.is_locked(ip, now), None);
        }

        // 5th attempt: Stage 1 lockout (60s)
        assert_eq!(limiter.record_failure(ip, now), Some((60, 1)));
        assert_eq!(limiter.is_locked(ip, now), Some((60, 1)));

        // Advance past Stage 1 lockout (+61s)
        let t1_expired = now + std::time::Duration::from_secs(61);
        assert_eq!(limiter.is_locked(ip, t1_expired), None);

        // Subsequent failure immediately escalates to Stage 2 (120s)
        assert_eq!(limiter.record_failure(ip, t1_expired), Some((120, 2)));
        assert_eq!(limiter.is_locked(ip, t1_expired), Some((120, 2)));

        // Advance past Stage 2 lockout (+121s)
        let t2_expired = t1_expired + std::time::Duration::from_secs(121);
        assert_eq!(limiter.is_locked(ip, t2_expired), None);

        // Subsequent failure immediately escalates to Stage 3 (300s = 5m)
        assert_eq!(limiter.record_failure(ip, t2_expired), Some((300, 3)));
        assert_eq!(limiter.is_locked(ip, t2_expired), Some((300, 3)));

        // Success clears the entire record back to initial state
        limiter.record_success(ip);
        assert_eq!(limiter.is_locked(ip, t2_expired), None);

        // Fresh attempt after success is just attempt 1 (no lockout)
        assert_eq!(limiter.record_failure(ip, t2_expired), None);
    }

    #[test]
    fn test_auth_rate_limiter_idle_decay_reset() {
        let mut limiter = AuthRateLimiter::new();
        let now = std::time::Instant::now();
        let ip = "10.0.0.1";

        // Trigger Stage 1 lockout (5 attempts)
        for _ in 1..=4 {
            limiter.record_failure(ip, now);
        }
        assert_eq!(limiter.record_failure(ip, now), Some((60, 1)));

        // Advance past lockout (60s) + idle threshold (901s) = 961s total inactivity
        let idle_expired = now + std::time::Duration::from_secs(961);
        assert_eq!(limiter.is_locked(ip, idle_expired), None);

        // Next failure after 15m idle should reset tier to 0, counting as attempt 1 of 5
        assert_eq!(limiter.record_failure(ip, idle_expired), None);
    }

    #[tokio::test]
    async fn test_proxy_brute_force_lockout_429() {
        let dummy = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = dummy.local_addr().unwrap().port();
        drop(dummy);

        let tx = test_event_sender();
        let proxy_port = start_proxy_with_auth(tx, port, Some("user:secret".to_string()))
            .await
            .unwrap();

        // 4 failed attempts -> 401 Unauthorized
        for _ in 1..=4 {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic dXNlcjp3cm9uZw==\r\n\r\n").await.unwrap();
            let mut res = vec![0u8; 512];
            let n = stream.read(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res[..n]);
            assert!(res_str.contains("401 Unauthorized"));
        }

        // 5th failed attempt -> 429 Too Many Requests (Lockout!)
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nAuthorization: Basic dXNlcjp3cm9uZw==\r\n\r\n").await.unwrap();
            let mut res = Vec::new();
            stream.read_to_end(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res);
            assert!(res_str.contains("429 Too Many Requests"));
            assert!(res_str.contains("Retry-After: 60"));
            assert!(res_str.contains("Authentication"));
            assert!(res_str.contains("Locked"));
            assert!(res_str.contains("TOO MANY ATTEMPTS"));
        }

        // Subsequent attempt while locked out -> immediately receives 429 Too Many Requests
        {
            let mut stream = TcpStream::connect(format!("127.0.0.1:{}", proxy_port)).await.unwrap();
            stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();
            let mut res = Vec::new();
            stream.read_to_end(&mut res).await.unwrap();
            let res_str = String::from_utf8_lossy(&res);
            assert!(res_str.contains("429 Too Many Requests"));
            assert!(res_str.contains("Locked"));
        }

        stop_proxy(Some(port)).await;
    }
}

