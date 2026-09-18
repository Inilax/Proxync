import { NextResponse } from "next/server";
import { DEFAULT_RELEASE, GITHUB_REPO_URL, ReleaseInfo } from "@/lib/release-constants";

export async function GET() {
  const envVersion = process.env.NEXT_PUBLIC_APP_VERSION || process.env.LATEST_RELEASE_VERSION;
  const token = process.env.GITHUB_TOKEN || process.env.PROXYNC_GITHUB_TOKEN;

  // Environment variable explicit override
  if (envVersion) {
    const cleanTag = envVersion.startsWith("v") ? envVersion : `v${envVersion}`;
    const version = cleanTag.replace(/^v/, "");
    return NextResponse.json({
      tagName: cleanTag,
      version,
      releaseUrl: `${GITHUB_REPO_URL}/releases/tag/${cleanTag}`,
      downloadUrl: `${GITHUB_REPO_URL}/releases/download/${cleanTag}/Proxync_${version}_x64-setup.exe`,
    });
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Proxync-Web-App",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(
      "https://api.github.com/repos/Inilax/Proxync/releases/latest",
      {
        headers,
        next: { revalidate: 3600 }, // Revalidate every 1 hour
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawTag = (data.tag_name || "").trim();
      
      const parseSemver = (v: string) => {
        const parts = v.replace(/^v/, "").split(".").map(Number);
        return {
          major: parts[0] || 0,
          minor: parts[1] || 0,
          patch: parts[2] || 0,
        };
      };

      const isNewerOrEqual = (a: string, b: string) => {
        const sa = parseSemver(a);
        const sb = parseSemver(b);
        if (sa.major !== sb.major) return sa.major > sb.major;
        if (sa.minor !== sb.minor) return sa.minor > sb.minor;
        return sa.patch >= sb.patch;
      };

      // Only adopt GitHub tag if it's equal to or newer than our DEFAULT_RELEASE (v0.2.1)
      const tagName = rawTag && isNewerOrEqual(rawTag, DEFAULT_RELEASE.tagName)
        ? rawTag
        : DEFAULT_RELEASE.tagName;
      const version = tagName.replace(/^v/, "");

      // Find direct .exe setup download link if attached in assets
      const windowsAsset = Array.isArray(data.assets)
        ? data.assets.find(
            (asset: { name?: string }) =>
              asset.name?.endsWith(".exe") || asset.name?.includes("setup")
          )
        : undefined;

      const downloadUrl =
        (tagName === rawTag && windowsAsset?.browser_download_url)
          ? windowsAsset.browser_download_url
          : `${GITHUB_REPO_URL}/releases/download/${tagName}/Proxync_${version}_x64-setup.exe`;

      const releaseUrl =
        (tagName === rawTag && data.html_url)
          ? data.html_url
          : `${GITHUB_REPO_URL}/releases/tag/${tagName}`;

      const releaseInfo: ReleaseInfo = {
        tagName,
        version,
        releaseUrl,
        downloadUrl,
        publishedAt: data.published_at,
      };

      return NextResponse.json({
        tagName: releaseInfo.tagName,
        version: releaseInfo.version,
        releaseUrl: releaseInfo.releaseUrl,
        downloadUrl: releaseInfo.downloadUrl,
        publishedAt: releaseInfo.publishedAt,
      });
    }
  } catch {
    // Fail silently and return DEFAULT_RELEASE fallback
  }

  return NextResponse.json({
    tagName: DEFAULT_RELEASE.tagName,
    version: DEFAULT_RELEASE.version,
    releaseUrl: DEFAULT_RELEASE.releaseUrl,
    downloadUrl: DEFAULT_RELEASE.downloadUrl,
  });
}
