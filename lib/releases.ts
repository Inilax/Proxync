"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_RELEASE,
  Platform,
  PlatformDownload,
  ReleaseInfo,
  getDownloadsForVersion,
} from "./release-constants";

export * from "./release-constants";

/**
 * Client hook to get the latest release data dynamically.
 * Starts with DEFAULT_RELEASE (v0.2.1) and updates asynchronously from /api/release.
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
      } catch {
        // Fail silently and keep DEFAULT_RELEASE
      }
    }

    fetchRelease();

    return () => {
      active = false;
    };
  }, []);

  return release;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "unknown";
}

/**
 * Returns the platform-specific download for the latest release.
 * SSR-safe: returns windows as default until client hydrates.
 */
export function usePlatformDownload(): PlatformDownload & { platform: Platform } {
  const release = useLatestRelease();
  const [platform, setPlatform] = useState<Platform>("windows"); // SSR-safe default

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const downloads = getDownloadsForVersion(release.version);
  return downloads[platform];
}
