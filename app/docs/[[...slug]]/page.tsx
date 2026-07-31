import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDocData, getDocSlugs } from "@/lib/docs";
import { extractHeadings, flattenNav } from "@/lib/docs-nav";
import { CHANGELOG_BLOB_URL } from "@/lib/changelog";
import { Markdown } from "@/components/docs/markdown";
import { PageToc } from "@/components/docs/page-toc";
import { PrevNext } from "@/components/docs/prev-next";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug: slug === "index" ? [] : [slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug?.[0] ?? "index";
  const { title, description } = await getDocData(name);
  return {
    title: title ? `${title} — Proxync Docs` : "Proxync Docs",
    description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const name = slug?.[0] ?? "index";
  const { title, description, content } = await getDocData(name);
  const headings = extractHeadings(content);
  const nav = flattenNav();
  const href = name === "index" ? "/docs" : `/docs/${name}`;
  const index = nav.findIndex((item) => item.href === href);
  const prev = index > 0 ? nav[index - 1] : null;
  const next = index >= 0 && index < nav.length - 1 ? nav[index + 1] : null;

  return (
    <div className="flex min-w-0 flex-1">
      <main className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-14">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-lg leading-relaxed text-on-surface-muted">
              {description}
            </p>
          ) : null}
          {name === "changelog" ? (
            <a
              href={CHANGELOG_BLOB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm text-on-surface-muted transition-colors hover:text-primary"
            >
              View on GitHub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <div className="mt-8">
            <Markdown content={content} />
          </div>
        </article>
        <div className="mx-auto max-w-3xl">
          <PrevNext prev={prev} next={next} />
        </div>
      </main>
      <PageToc headings={headings} />
    </div>
  );
}
