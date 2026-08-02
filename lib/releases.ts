"use client";

import { useEffect, useState } from "react";

export interface ReleaseInfo {
  tagName: string;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt?: string;
}

export const GITHUB_REPO_URL = "https://github.com/Inilax/Proxync";
export const DEFAULT_VERSION = "0.1.8";
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

/**
 * Client hook to get the latest release data dynamically.
 * Starts with DEFAULT_RELEASE (v0.1.8) and updates asynchronously from /api/release.
 */
export function useLatestRelease(): ReleaseInfo {
  const [release, setRelease] = useState<ReleaseInfo>(DEFAULT_RELEASE);

  useEffect(() => {
    let active = true;

    async function fetchRelease() {
      try {
        const res = await fetch("/api/release");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.tagName) {
          setRelease(data);
        }
      } catch (err) {
        // Fall back gracefully to default state
      }
    }

    fetchRelease();

    return () => {
      active = false;
    };
  }, []);

  return release;
}
