export type ChangelogEntry = {
  tag: string;
  date?: string;
  title?: string;
  summary: string;
  files: string[];
  isVersion: boolean;
};

/**
 * Once the repository is public, the changelog source will switch to these
 * GitHub URLs instead of the bundled `data/changelog.md`.
 */
export const CHANGELOG_BLOB_URL =
  "https://github.com/Inilax/Proxync/blob/main/CHANGELOG.md";
export const CHANGELOG_RAW_URL =
  "https://raw.githubusercontent.com/Inilax/Proxync/main/CHANGELOG.md";

export function isVersionTag(tag: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(tag.trim());
}

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    const headerMatch = line.match(/^##\s+\[(.+?)\](?:\s*-\s*(.*))?$/);
    if (headerMatch) {
      current = {
        tag: headerMatch[1].trim(),
        summary: "",
        files: [],
        isVersion: isVersionTag(headerMatch[1]),
      };
      entries.push(current);

      const rest = headerMatch[2] ?? "";
      const dateMatch = rest.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) current.date = dateMatch[1];
      const titleMatch = rest.match(/\(([^)]+)\)\s*$/);
      if (titleMatch) current.title = titleMatch[1].trim();
      continue;
    }

    if (!current) continue;

    const summaryMatch = line.match(/^\s*-\s*\*\*Feature Summary\*\*:\s*(.*)$/);
    if (summaryMatch) {
      current.summary = summaryMatch[1].trim();
      continue;
    }

    if (line.includes("**Modified Files**") || line.includes("**Modified/Deleted Files**")) {
      continue;
    }

    const fileMatch = line.match(/^\s*-\s*`(.+?)`\s*$/);
    if (fileMatch) {
      current.files.push(fileMatch[1]);
      continue;
    }
  }

  return entries;
}

export function formatEntryDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
