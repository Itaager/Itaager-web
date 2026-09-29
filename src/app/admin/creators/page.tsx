import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { AddUserForm } from "@/components/admin/add-user-form";
import { StatusToggle } from "@/components/admin/admin-buttons";
import { ApprovalPill, ReviewButtons } from "@/components/admin/review-buttons";
import { buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Avatar, Card, EmptyState, PageHeader, Pill } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, CreatorApproval, CreatorProfile } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Creators" };

type Row = CreatorProfile & { profile: { status: AccountStatus; email: string } | null };
const TABS: { id: CreatorApproval | "all"; label: string }[] = [
  { id: "pending", label: "Pending review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export default async function AdminCreatorsPage({ searchParams }: PageProps<"/admin/creators">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\p{L}\p{N}\s_-]/gu, "").slice(0, 50).trim() : "";
  const supabase = await createClient();

  const counts = Object.fromEntries(
    await Promise.all(
      (["pending", "approved", "rejected"] as const).map(async (s) => {
        const { count } = await supabase.from("creator_profiles").select("id", { count: "exact", head: true }).eq("approval_status", s);
        return [s, count ?? 0] as const;
      }),
    ),
  ) as Record<CreatorApproval, number>;

  const requested = TABS.find((t) => t.id === sp.tab)?.id;
  const tab = requested ?? (counts.pending > 0 ? "pending" : "all");

  let query = supabase
    .from("creator_profiles")
    .select("*, profile:profiles(status, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (tab !== "all") query = query.eq("approval_status", tab);
  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  const { data: creators } = await query.returns<Row[]>();

  return (
    <>
      <PageHeader title="Creators" description="Review new creators before their page goes live." action={<AddUserForm />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 text-sm" role="tablist">
          {TABS.map((t) => (
            <Link
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              href={`/admin/creators?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn("rounded-md px-2.5 py-1.5 font-medium", tab === t.id ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2")}
            >
              {t.label}
              {t.id !== "all" && <span className="ml-1.5 text-ink-3 tabular-nums">{counts[t.id]}</span>}
            </Link>
          ))}
        </div>
        <form action="/admin/creators" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input name="q" defaultValue={q} placeholder="Search creators" className="h-9 w-56 pl-9" aria-label="Search creators" />
          </div>
          <button className={buttonClass("outline", "md")}>Search</button>
        </form>
      </div>

      <Card>
        {creators && creators.length > 0 ? (
          <ul className="divide-y divide-line">
            {creators.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Link href={`/admin/creators/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={c.avatar_url} name={c.display_name} size={40} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {c.display_name}
                      <ApprovalPill status={c.approval_status} />
                      {c.profile?.status === "suspended" && <Pill tone="bad">Suspended</Pill>}
                    </p>
                    <p className="truncate text-xs text-ink-3">
                      @{c.username} · {c.profile?.email} · {c.category} · joined {formatDate(c.created_at)}
                    </p>
                    {c.bio && <p className="mt-1 line-clamp-1 text-sm text-ink-2">{c.bio}</p>}
                  </div>
                </Link>
                <div className="text-right text-sm tabular-nums">
                  <p className="font-medium text-ink">{formatMoney(c.total_earnings)}</p>
                  <p className="text-xs text-ink-3">{c.total_supporters} supporters</p>
                </div>
                <div className="flex items-center gap-2">
                  <ReviewButtons creatorId={c.id} name={c.display_name} status={c.approval_status} />
                  {c.profile && c.approval_status === "approved" && (
                    <StatusToggle userId={c.user_id} status={c.profile.status} label={`@${c.username}`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Sparkles}
            title={tab === "pending" ? "Nothing to review" : "No creators found"}
            description={tab === "pending" ? "New creator sign-ups will appear here." : undefined}
          />
        )}
      </Card>
    </>
  );
}
