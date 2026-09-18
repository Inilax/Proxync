import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import { CHANGELOG_RAW_URL } from "./changelog";

export type { DocHeading, DocsNavGroup, DocsNavItem } from "./docs-nav";
export { DOCS_NAV, extractHeadings, flattenNav, slugify } from "./docs-nav";

function slugToFile(slug: string): string {
  if (slug === "index") {
    return path.join(process.cwd(), "data", "docs", "index.md");
  }
  return path.join(process.cwd(), "data", "docs", `${slug}.md`);
}

function parseFrontmatter(raw: string): { title: string; description: string; content: string } {
  const meta = { title: "", description: "" };
  let content = raw;

  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) {
      const block = raw.slice(3, end);
      content = raw.slice(end + 4);
      for (const line of block.split("\n")) {
        const separator = line.indexOf(":");
        if (separator === -1) continue;
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (key === "title") meta.title = value;
        if (key === "description") meta.description = value;
      }
    }
  }

  return { ...meta, content: content.replace(/^\s*\r?\n/, "") };
}

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+(?:\r?\n)+/, "");
}

function fallbackTitle(slug: string): string {
  if (slug === "changelog") return "Changelog";
  if (slug === "index") return "Overview";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("timeout", () => req.destroy(new Error("Fetch timed out")));
    req.on("error", reject);
  });
}

async function loadChangelog(): Promise<string> {
  try {
    return await fetchText(CHANGELOG_RAW_URL);
  } catch {
    return "# Changelog\n\nAll notable changes to the Proxync workspace studio project are documented here.\n\n*Unable to load live changelog from GitHub.*";
  }
}

export async function getDocData(slug: string): Promise<{
  slug: string;
  title: string;
  description: string;
  content: string;
}> {
  const raw = slug === "changelog" ? await loadChangelog() : readFileSync(slugToFile(slug), "utf8");
  const { title, description, content } = parseFrontmatter(raw);
  return {
    slug,
    title: title || fallbackTitle(slug),
    description,
    content: stripLeadingH1(content),
  };
}

export function getDocSlugs(): string[] {
  const dir = path.join(process.cwd(), "data", "docs");
  const slugs = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
  return [...new Set(["index", ...slugs, "changelog"])];
}
