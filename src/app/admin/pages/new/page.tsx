import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageEditor } from "@/components/admin/page-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "New page" };

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/pages" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pages
      </Link>
      <PageHeader title="New page" />
      <PageEditor
        defaults={{ title: "", slug: "", metaDescription: "", content: "", status: "draft", showInFooter: true, sortOrder: 10 }}
      />
    </>
  );
}
