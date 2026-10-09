/**
 * Device & Machine Identification Utilities
 */

export function getOrCreateMachineId(): string {
  if (typeof window === 'undefined') return 'prx-desktop-client';
  let mId = localStorage.getItem('proxync_client_machine_id');
  if (!mId) {
    mId = 'prx-mach-' + crypto.randomUUID();
    localStorage.setItem('proxync_client_machine_id', mId);
  }
  return mId;
}

export function getClientDeviceInfo() {
  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || '').toLowerCase() : '';
  const isWindows = ua.includes('windows') || platform.includes('win');
  const isMac = ua.includes('macintosh') || platform.includes('mac');
  const isLinux = ua.includes('linux') || platform.includes('linux');
  const os = isWindows ? 'windows' : isMac ? 'macos' : isLinux ? 'linux' : 'windows';

  return {
    machineId: getOrCreateMachineId(),
    deviceName: `${isWindows ? 'Windows Desktop' : isMac ? 'macOS Client' : 'Linux Client'}`,
    os,
    appVersion: '1.2.0',
  };
}
