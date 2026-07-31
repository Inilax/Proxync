export type DocsNavItem = { title: string; href: string };
export type DocsNavGroup = { group: string; items: DocsNavItem[] };
export type DocHeading = { level: number; text: string; id: string };

export const DOCS_NAV: DocsNavGroup[] = [
  {
    group: "Getting Started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    group: "Guides",
    items: [
      { title: "Workspaces", href: "/docs/workspaces" },
      { title: "Tunnels & Sharing", href: "/docs/tunnels" },
      { title: "Traffic Inspector", href: "/docs/traffic" },
      { title: "Postman Runner", href: "/docs/postman" },
      { title: "Swagger & OpenAPI", href: "/docs/swagger" },
      { title: "Settings & Domains", href: "/docs/settings" },
    ],
  },
  {
    group: "Reference",
    items: [
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "Configuration", href: "/docs/configuration" },
      { title: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    group: "Project",
    items: [
      { title: "Changelog", href: "/docs/changelog" },
      { title: "FAQ", href: "/docs/faq" },
      { title: "Roadmap", href: "/docs/roadmap" },
    ],
  },
];

export function flattenNav(): DocsNavItem[] {
  return DOCS_NAV.flatMap((group) => group.items);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function extractHeadings(content: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const pattern = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const text = match[2].replace(/[`*_]/g, "").trim();
    if (!text) continue;
    headings.push({ level: match[1].length, text, id: slugify(text) });
  }
  return headings;
}
