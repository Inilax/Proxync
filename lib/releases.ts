"use client";

import { useEffect, useState } from "react";
import { DEFAULT_RELEASE, ReleaseInfo } from "./release-constants";

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
