import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CmsPage } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("id, slug, title, status, show_in_footer, sort_order, updated_at")
    .order("sort_order")
    .order("title")
    .returns<CmsPage[]>();

  return (
    <>
      <PageHeader
        title="Pages"
        description="Create pages like Terms, Privacy, Contact or About. Published pages appear on the website."
        action={<LinkButton href="/admin/pages/new" variant="accent"><Plus className="size-4" aria-hidden /> New page</LinkButton>}
      />
      <Card>
        {pages && pages.length > 0 ? (
          <ul className="divide-y divide-line">
            {pages.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <FileText className="size-5 shrink-0 text-ink-3" aria-hidden />
                <Link href={`/admin/pages/${p.id}`} className="min-w-0 flex-1">
                  <p className="font-medium text-ink hover:text-brand">{p.title}</p>
                  <p className="text-xs text-ink-3">itaager.com/{p.slug} · updated {formatDate(p.updated_at)}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {p.show_in_footer && <Pill>Footer</Pill>}
                  <Pill tone={p.status === "published" ? "good" : "neutral"}>{p.status === "published" ? "Published" : "Draft"}</Pill>
                  {p.status === "published" && (
                    <a href={`/${p.slug}`} target="_blank" className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={`Open ${p.title}`}>
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FileText} title="No pages yet" description="Create your first page, for example Terms & Conditions." />
        )}
      </Card>
    </>
  );
}
