import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageEditor } from "@/components/admin/page-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CmsPage } from "@/lib/types";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("*").eq("id", id).maybeSingle<CmsPage>();
  if (!page) notFound();

  return (
    <>
      <Link href="/admin/pages" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pages
      </Link>
      <PageHeader title={page.title} />
      <PageEditor
        key={page.updated_at}
        defaults={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          metaDescription: page.meta_description ?? "",
          content: page.content,
          status: page.status,
          showInFooter: page.show_in_footer,
          sortOrder: page.sort_order,
        }}
      />
    </>
  );
}
