import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, ExternalLink, Users, Wallet } from "lucide-react";
import { StatusToggle } from "@/components/admin/admin-buttons";
import { ApprovalPill, ReviewButtons } from "@/components/admin/review-buttons";
import { TxTable, type TxRow } from "@/components/dashboard/transactions";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Card, CardHeader, EmptyState, Pill, StatCard } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile, Profile } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Creator" };

export default async function AdminCreatorPage({ params }: PageProps<"/admin/creators/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: creator } = await supabase.from("creator_profiles").select("*").eq("id", id).maybeSingle<CreatorProfile>();
  if (!creator) notFound();

  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", creator.user_id).single<Profile>(),
    supabase.from("transactions").select("*").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(20).returns<TxRow[]>(),
  ]);

  return (
    <>
      <Link href="/admin/creators" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Creators
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar src={creator.avatar_url} name={creator.display_name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{creator.display_name}</h1>
              <ApprovalPill status={creator.approval_status} />
              {profile?.status === "suspended" && <Pill tone="bad">Suspended</Pill>}
              <Pill tone="brand">{creator.category}</Pill>
            </div>
            <p className="text-ink-3">@{creator.username}</p>
            {creator.bio && <p className="mt-3 max-w-2xl text-sm text-ink-2">{creator.bio}</p>}
            {creator.review_note && <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm text-ink-2">Review note: {creator.review_note}</p>}
          </div>
          <div className="flex items-start gap-2">
            <LinkButton href={`/creator/${creator.username}`} target="_blank" variant="outline" size="sm">
              Public page <ExternalLink className="size-3.5" aria-hidden />
            </LinkButton>
            <ReviewButtons creatorId={creator.id} name={creator.display_name} status={creator.approval_status} />
            {profile && creator.approval_status === "approved" && <StatusToggle userId={creator.user_id} status={profile.status} label={`@${creator.username}`} />}
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-4">
          <div><dt className="text-ink-3">Email</dt><dd className="mt-1 break-all font-medium text-ink">{profile?.email}</dd></div>
          <div><dt className="text-ink-3">Phone</dt><dd className="mt-1 font-medium text-ink">{profile?.phone ? `+${profile.phone}` : "—"}</dd></div>
          <div><dt className="text-ink-3">Location</dt><dd className="mt-1 font-medium text-ink">{creator.location ?? "—"}</dd></div>
          <div><dt className="text-ink-3">Joined</dt><dd className="mt-1 font-medium text-ink">{formatDate(creator.created_at)}</dd></div>
        </dl>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Creator earnings" value={formatMoney(creator.total_earnings)} icon={Wallet} />
        <StatCard label="Supporters" value={String(creator.total_supporters)} icon={Users} />
        <StatCard label="Successful payments" value={String(creator.total_transactions)} icon={CreditCard} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent transactions" action={<Link href={`/admin/transactions?creator=${creator.id}`} className="text-sm font-semibold text-brand hover:underline">Search all</Link>} />
        {txs && txs.length > 0 ? <TxTable rows={txs} linkBase="/admin/transactions" /> : <EmptyState title="No transactions yet" />}
      </Card>
    </>
  );
}
