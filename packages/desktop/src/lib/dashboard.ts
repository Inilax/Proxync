import { openUrl } from '@tauri-apps/plugin-opener';
import { logApp } from './logger';
import { BACKEND_URL, getDashboardBaseUrl } from './config';
import { getAuthSession } from './session';

/**
 * Micro-Frontend Launcher: Opens the hosted Proxync Web Dashboard.
 *
 * Rather than bundling heavy billing/Stripe/account code into the open-source client,
 * this function requests a short-lived (30s) single-use SSO magic ticket and securely
 * handshakes the authenticated user into dashboard.proxync.dev.
 *
 * @param view Target section to activate (defaults to 'billing')
 */
export async function openDashboard(view: string = 'billing'): Promise<void> {
  const session = getAuthSession();
  const dashboardBase = getDashboardBaseUrl();

  if (session?.accessToken) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/dashboard-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          ...(session.deviceId ? { 'x-device-id': session.deviceId } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          const nextParam = view ? `&next=${encodeURIComponent(view)}` : '';
          const ssoUrl = `${dashboardBase}/auth/exchange?ticket=${encodeURIComponent(data.ticket)}${nextParam}`;
          await openUrl(ssoUrl).catch(() => {
            window.open(ssoUrl, '_blank');
          });
          return;
        }
      }
    } catch (err) {
      logApp('SYSTEM', 'WARN', 'Failed to generate SSO ticket for dashboard redirect', err);
    }
  }

  // Fallback for unauthenticated user or if ticket generation failed
  const targetUrl = view === 'billing'
    ? `${dashboardBase}/?view=billing`
    : view
    ? `${dashboardBase}/?view=${encodeURIComponent(view)}`
    : dashboardBase;

  await openUrl(targetUrl).catch(() => {
    window.open(targetUrl, '_blank');
  });
}
