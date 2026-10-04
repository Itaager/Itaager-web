import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/site/markdown";
import { getPublishedPage } from "@/lib/pages";
import { formatDate } from "@/lib/utils";

// Pages created by the super admin (Terms, Privacy, Contact, About, ...).
// Static routes such as /explore take priority over this dynamic segment.

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: page.meta_description ?? undefined,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.meta_description ?? undefined, url: `/${page.slug}` },
  };
}

export default async function CmsPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">{page.title}</h1>
      <p className="mt-3 text-sm text-ink-3">Updated {formatDate(page.updated_at)}</p>
      <div className="mt-10 border-t border-line pt-8">
        <Markdown>{page.content}</Markdown>
      </div>
    </article>
  );
}
