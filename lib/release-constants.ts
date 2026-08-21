export interface ReleaseInfo {
  tagName: string;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt?: string;
}

export const GITHUB_REPO_URL = "https://github.com/Inilax/Proxync";
export const DEFAULT_VERSION = "0.2.1";
export const DEFAULT_TAG = `v${DEFAULT_VERSION}`;

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
