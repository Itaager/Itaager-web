import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, Clock, CreditCard, Heart, Landmark, Sparkles, Users, Wallet } from "lucide-react";
import { ReviewButtons } from "@/components/admin/review-buttons";
import { BarChart } from "@/components/dashboard/bar-chart";
import { TxTable, type TxRow } from "@/components/dashboard/transactions";
import { Avatar, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export type PlatformStats = {
  total_users: number;
  total_creators: number;
  total_supporters: number;
  total_transactions: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  gross_volume: number;
  platform_revenue: number;
  creator_earnings: number;
};

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: statsRaw }, { data: monthlyRaw }, { data: recent }, { data: pendingCreators, count: pendingCount }] = await Promise.all([
    supabase.rpc("admin_platform_stats"),
    supabase.rpc("admin_monthly_volume", { p_months: 12 }),
    supabase
      .from("transactions")
      .select("*, creator:creator_profiles(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<TxRow[]>(),
    supabase
      .from("creator_profiles")
      .select("*", { count: "exact" })
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true })
      .limit(5)
      .returns<CreatorProfile[]>(),
  ]);
  const monthly = monthlyRaw as { month: string; volume: number; revenue: number }[] | null;
  const stats = statsRaw as PlatformStats | null;
  const s = stats ?? ({} as PlatformStats);
  const n = (v: number | undefined) => new Intl.NumberFormat("en-US").format(Number(v ?? 0));

  return (
    <>
      <PageHeader title="Dashboard" description="Everything happening on Itaager." />

      {pendingCreators && pendingCreators.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title={`Waiting for review · ${pendingCount ?? pendingCreators.length}`}
            description="New creators can't receive payments until you approve them."
            action={<Link href="/admin/creators?tab=pending" className="text-sm font-medium text-ink-2 hover:text-ink">View all</Link>}
          />
          <ul className="divide-y divide-line">
            {pendingCreators.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link href={`/admin/creators/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={c.avatar_url} name={c.display_name} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.display_name} <span className="font-normal text-ink-3">@{c.username}</span></p>
                    <p className="text-xs text-ink-3">{c.category} · signed up {formatDate(c.created_at)}</p>
                  </div>
                </Link>
                <ReviewButtons creatorId={c.id} name={c.display_name} status={c.approval_status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform revenue" value={formatMoney(s.platform_revenue ?? 0)} hint="Fees from successful payments" icon={Landmark} />
        <StatCard label="Gross volume" value={formatMoney(s.gross_volume ?? 0)} icon={Wallet} />
        <StatCard label="Creator earnings" value={formatMoney(s.creator_earnings ?? 0)} icon={Sparkles} />
        <StatCard label="Transactions" value={n(s.total_transactions)} hint="All statuses" icon={CreditCard} />
        <StatCard label="Total users" value={n(s.total_users)} icon={Users} />
        <StatCard label="Creators" value={n(s.total_creators)} icon={Sparkles} />
        <StatCard label="Supporters" value={n(s.total_supporters)} hint="Unique paying numbers" icon={Heart} />
        <Card className="p-5">
          <p className="text-sm font-medium text-ink-2">Payment outcomes</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-good"><CheckCircle2 className="size-4" aria-hidden /> Successful</span><span className="font-semibold tabular-nums text-ink">{n(s.successful_payments)}</span></li>
            <li className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-bad"><Ban className="size-4" aria-hidden /> Failed</span><span className="font-semibold tabular-nums text-ink">{n(s.failed_payments)}</span></li>
            <li className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-warn"><Clock className="size-4" aria-hidden /> Pending</span><span className="font-semibold tabular-nums text-ink">{n(s.pending_payments)}</span></li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Platform revenue" description="Fees collected per month, last 12 months" action={<Link href="/admin/reports" className="text-sm font-semibold text-brand hover:underline">Reports</Link>} />
        <div className="p-5">
          <BarChart
            data={(monthly ?? []).map((m) => ({ label: new Date(m.month).toLocaleString("en-US", { month: "short", timeZone: "UTC" }), value: Number(m.revenue) }))}
            format="usd"
            seriesLabel="Revenue"
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Latest payments"
          action={<Link href="/admin/transactions" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">All payments <ArrowRight className="size-4" aria-hidden /></Link>}
        />
        {recent && recent.length > 0 ? <TxTable rows={recent} showCreator linkBase="/admin/transactions" /> : <EmptyState title="No transactions yet" />}
      </Card>
    </>
  );
}
