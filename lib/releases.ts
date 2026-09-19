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
 * Starts with DEFAULT_RELEASE (v0.2.2) and updates asynchronously from /api/release.
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

/**
 * Robust cross-browser platform detection for Windows, macOS, and Linux.
 * Checks modern navigator.userAgentData (Client Hints), navigator.platform, and navigator.userAgent.
 */
export function detectPlatform(): Platform {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "windows";

  // 1. Check navigator.userAgentData (modern Chromium browsers on Windows, macOS, Linux)
  const navAny = navigator as unknown as { userAgentData?: { platform?: string } };
  if (navAny.userAgentData?.platform) {
    const p = navAny.userAgentData.platform.toLowerCase();
    if (p.includes("mac")) return "macos";
    if (p.includes("win")) return "windows";
    if (p.includes("linux")) return "linux";
  }

  // 2. Check navigator.platform
  const platformStr = (navigator.platform || "").toLowerCase();
  if (platformStr.includes("mac")) return "macos";
  if (platformStr.includes("win")) return "windows";
  if (platformStr.includes("linux")) return "linux";

  // 3. Check navigator.userAgent
  const ua = navigator.userAgent.toLowerCase();

  // Guard against iOS devices reporting as Macintosh
  if (/iphone|ipad|ipod/i.test(ua)) {
    if (ua.includes("macintosh") && navigator.maxTouchPoints > 1) {
      return "macos";
    }
    return "unknown";
  }

  if (ua.includes("macintosh") || ua.includes("mac os x")) return "macos";
  if (ua.includes("windows") || ua.includes("win32") || ua.includes("win64")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";

  return "windows";
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
  return {
    ...downloads[platform],
    platform,
  };
}
