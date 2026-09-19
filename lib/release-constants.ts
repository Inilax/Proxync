export interface ReleaseInfo {
  tagName: string;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt?: string;
}

export type Platform = "windows" | "macos" | "linux" | "unknown";

export interface PlatformDownload {
  platform: Platform;
  label: string;
  ext: string;
  url: string;
  isAvailable: boolean;
  statusNote?: string;
}

export const GITHUB_REPO_URL = "https://github.com/Inilax/Proxync";
export const DEFAULT_VERSION = "0.2.2";
export const DEFAULT_TAG = `v${DEFAULT_VERSION}`;

export function getDownloadsForVersion(version: string): Record<Platform, PlatformDownload> {
  const base = `${GITHUB_REPO_URL}/releases/download/v${version}`;
  const releasePage = `${GITHUB_REPO_URL}/releases/tag/v${version}`;
  return {
    windows: {
      platform: "windows",
      label: "Download for Windows (x64)",
      ext: ".exe",
      url: `${base}/Proxync_${version}_x64-setup.exe`,
      isAvailable: true,
      statusNote: "x64 MSI / Setup (.exe)",
    },
    macos: {
      platform: "macos",
      label: "Download for macOS (.dmg)",
      ext: ".dmg",
      url: `${base}/Proxync_${version}_universal.dmg`,
      isAvailable: true,
      statusNote: "Universal .dmg (arm64 & x64)",
    },
    linux: {
      platform: "linux",
      label: "Download for Linux (.deb)",
      ext: ".deb",
      url: `${base}/proxync_${version}_amd64.deb`,
      isAvailable: true,
      statusNote: ".deb / AppImage (x64)",
    },
    unknown: {
      platform: "unknown",
      label: "Download for Windows (x64)",
      ext: ".exe",
      url: `${base}/Proxync_${version}_x64-setup.exe`,
      isAvailable: true,
      statusNote: "x64 Setup (.exe)",
    },
  };
}

export interface ReleaseAssetOption {
  id: string;
  platform: Platform;
  label: string;
  sublabel: string;
  ext: string;
  filename: string;
  url: string;
  isPrimary?: boolean;
}

export function getAllReleaseAssets(version: string): ReleaseAssetOption[] {
  const base = `${GITHUB_REPO_URL}/releases/download/v${version}`;
  return [
    {
      id: "win-setup",
      platform: "windows",
      label: "Windows (.exe)",
      sublabel: "Setup Wizard (x64) · Recommended",
      ext: ".exe",
      filename: `Proxync_${version}_x64-setup.exe`,
      url: `${base}/Proxync_${version}_x64-setup.exe`,
      isPrimary: true,
    },
    {
      id: "win-msi",
      platform: "windows",
      label: "Windows (.msi)",
      sublabel: "Enterprise MSI Package (x64)",
      ext: ".msi",
      filename: `Proxync_${version}_x64_en-US.msi`,
      url: `${base}/Proxync_${version}_x64_en-US.msi`,
    },
    {
      id: "mac-dmg",
      platform: "macos",
      label: "macOS (.dmg)",
      sublabel: "Universal binary (Apple Silicon & Intel)",
      ext: ".dmg",
      filename: `Proxync_${version}_universal.dmg`,
      url: `${base}/Proxync_${version}_universal.dmg`,
      isPrimary: true,
    },
    {
      id: "linux-deb",
      platform: "linux",
      label: "Linux (.deb)",
      sublabel: "Debian / Ubuntu / Mint (x64)",
      ext: ".deb",
      filename: `proxync_${version}_amd64.deb`,
      url: `${base}/proxync_${version}_amd64.deb`,
      isPrimary: true,
    },
    {
      id: "linux-appimage",
      platform: "linux",
      label: "Linux (.AppImage)",
      sublabel: "Standalone Universal bundle (x64)",
      ext: ".AppImage",
      filename: `Proxync_${version}_amd64.AppImage`,
      url: `${base}/Proxync_${version}_amd64.AppImage`,
    },
  ];
}

export const DEFAULT_RELEASE: ReleaseInfo = {
  tagName: DEFAULT_TAG,
  version: DEFAULT_VERSION,
  releaseUrl: `${GITHUB_REPO_URL}/releases/tag/${DEFAULT_TAG}`,
  downloadUrl: `${GITHUB_REPO_URL}/releases/download/${DEFAULT_TAG}/Proxync_${DEFAULT_VERSION}_x64-setup.exe`,
};

export function getReleaseForTag(tagOrVersion: string): ReleaseInfo {
  const cleanTag = tagOrVersion.startsWith("v") ? tagOrVersion : `v${tagOrVersion}`;
  const version = cleanTag.replace(/^v/, "");
  return {
    tagName: cleanTag,
    version,
    releaseUrl: `${GITHUB_REPO_URL}/releases/tag/${cleanTag}`,
    downloadUrl: `${GITHUB_REPO_URL}/releases/download/${cleanTag}/Proxync_${version}_x64-setup.exe`,
  };
}
