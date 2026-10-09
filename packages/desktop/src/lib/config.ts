/**
 * Application Configuration & Endpoint Resolution
 *
 * Centralized endpoint constants for Proxync client.
 * In open-source client distributions, these define the default public endpoints
 * (e.g. dashboard.proxync.dev) and permit local development overrides.
 */

export const BACKEND_URL = typeof window !== 'undefined' && localStorage.getItem('proxync_backend_url') 
  ? localStorage.getItem('proxync_backend_url')! 
  : 'http://localhost:3000';

export const PROD_DASHBOARD_URL = typeof window !== 'undefined' && localStorage.getItem('proxync_dashboard_url')
  ? localStorage.getItem('proxync_dashboard_url')!
  : 'https://dashboard.proxync.dev';

export function getDashboardBaseUrl(): string {
  if (typeof window !== 'undefined' && localStorage.getItem('proxync_dashboard_url')) {
    return localStorage.getItem('proxync_dashboard_url')!;
  }
  // Route to local backend when developing against localhost
  if (BACKEND_URL && (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1'))) {
    return BACKEND_URL;
  }
  return PROD_DASHBOARD_URL;
}
