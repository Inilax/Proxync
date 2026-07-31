import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { slugify } from "@/lib/docs-nav";

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (typeof node === "object" && "props" in node) {
    return textFromNode((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function Heading({ level, children }: { level: 2 | 3; children?: ReactNode }) {
  const text = textFromNode(children);
  const id = slugify(text);
  const Tag = level === 2 ? "h2" : "h3";
  return <Tag id={id}>{children}</Tag>;
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="doc-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children }) => <Heading level={2}>{children}</Heading>,
          h3: ({ children }) => <Heading level={3}>{children}</Heading>,
          h4: ({ children }) => <h4>{children}</h4>,
          a: ({ children, href }) => {
            const external =
              typeof href === "string" && (href.startsWith("http") || href.startsWith("mailto:"));
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
          code: ({ children, className }) => {
            const isBlock = typeof className === "string" && className.includes("language-");
            if (isBlock) return <code className={className}>{children}</code>;
            return <code>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
