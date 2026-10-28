import { invoke } from '@tauri-apps/api/core';

export interface CliStatus {
  is_installed: boolean;
  binary_path: string | null;
  install_dir: string;
  in_path: boolean;
}

export async function checkCliStatus(): Promise<CliStatus> {
  try {
    return await invoke<CliStatus>('check_cli_status');
  } catch (err) {
    console.error('Failed to check CLI status:', err);
    return {
      is_installed: false,
      binary_path: null,
      install_dir: '',
      in_path: false,
    };
  }
}

export async function installCliToPath(): Promise<string> {
  return await invoke<string>('install_cli_to_path');
}

export async function uninstallCliFromPath(): Promise<string> {
  return await invoke<string>('uninstall_cli_from_path');
}
