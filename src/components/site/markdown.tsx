import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Raw HTML in the markdown is NOT rendered (react-markdown's default), so page
// content written in the admin dashboard can't inject scripts.
const components: Components = {
  h1: (p) => <h2 className="mt-10 text-3xl font-bold tracking-tight text-ink first:mt-0" {...p} />,
  h2: (p) => <h2 className="mt-10 text-2xl font-bold tracking-tight text-ink first:mt-0" {...p} />,
  h3: (p) => <h3 className="mt-8 text-lg font-semibold text-ink" {...p} />,
  p: (p) => <p className="mt-4 leading-relaxed text-ink-2" {...p} />,
  ul: (p) => <ul className="mt-4 list-disc space-y-2 pl-6 text-ink-2 marker:text-ink-3" {...p} />,
  ol: (p) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink-2 marker:text-ink-3" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  blockquote: (p) => <blockquote className="mt-6 rounded-lg border-l-4 border-brand bg-brand-soft px-4 py-3 text-ink-2 [&>p]:mt-0" {...p} />,
  code: (p) => <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-ink" {...p} />,
  hr: () => <hr className="my-10 border-line" />,
  table: (p) => (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-line bg-surface-2 px-3 py-2 font-semibold text-ink" {...p} />,
  td: (p) => <td className="border-b border-line px-3 py-2 text-ink-2" {...p} />,
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="font-medium text-brand underline underline-offset-2 hover:text-brand-strong">{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand underline underline-offset-2 hover:text-brand-strong">
        {children}
      </a>
    ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[16px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
