import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, PartyPopper, Users, Wallet } from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { TxTable, type TxRow } from "@/components/dashboard/transactions";
import { CopyLink } from "@/components/dashboard/copy-link";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function OverviewPage({ searchParams }: PageProps<"/dashboard">) {
  const { creator } = await requireCreator();
  const welcome = (await searchParams).welcome === "1";
  const supabase = await createClient();

  const [{ data: monthlyRaw }, { data: recent }] = await Promise.all([
    supabase.rpc("creator_monthly_earnings", { p_months: 6 }),
    supabase
      .from("transactions")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<TxRow[]>(),
  ]);
  const monthly = monthlyRaw as { month: string; earnings: number }[] | null;

  const thisMonth = Number(monthly?.at(-1)?.earnings ?? 0);
  const chart = (monthly ?? []).map((m) => ({
    label: new Date(m.month).toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    value: Number(m.earnings),
  }));
  const pageUrl = `${siteUrl}/creator/${creator.username}`;

  return (
    <>
      <PageHeader title={`Welcome, ${creator.display_name.split(" ")[0]}`} description="Here's how your page is doing." />

      {welcome && (
        <Card className="mb-6 flex flex-col gap-4 border-accent/40 bg-accent-soft p-5 sm:flex-row sm:items-center">
          <PartyPopper className="size-7 text-accent-strong" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-ink">Your page is live!</p>
            <p className="text-sm text-ink-2">Share your link so people can start supporting you.</p>
          </div>
          <CopyLink url={pageUrl} />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total earnings" value={formatMoney(creator.total_earnings)} hint="After platform fee" icon={Wallet} />
        <StatCard label="This month" value={formatMoney(thisMonth)} icon={CalendarDays} />
        <StatCard label="Total supporters" value={String(creator.total_supporters)} icon={Users} />
        <StatCard label="Total transactions" value={String(creator.total_transactions)} hint="Successful payments" icon={CreditCard} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Earnings" description="Last 6 months, after platform fee" action={<Link href="/dashboard/earnings" className="text-sm font-semibold text-brand hover:underline">Details</Link>} />
        <div className="p-5">
          <BarChart data={chart} format="usd" seriesLabel="Earnings" />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Recent payments"
          action={
            <Link href="/dashboard/payments" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              View all <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        {recent && recent.length > 0 ? (
          <TxTable rows={recent} />
        ) : (
          <EmptyState title="No payments yet" description="Share your page link to get your first supporter." action={<CopyLink url={pageUrl} />} />
        )}
      </Card>
    </>
  );
}
