import type { Metadata } from "next";
import { Percent, Receipt, Wallet } from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const { creator } = await requireCreator();
  const supabase = await createClient();

  const [{ data: monthlyRaw }, { data: sums }, { data: settings }] = await Promise.all([
    supabase.rpc("creator_monthly_earnings", { p_months: 12 }),
    supabase
      .from("transactions")
      .select("amount_usd, platform_fee, creator_amount")
      .eq("creator_id", creator.id)
      .eq("status", "successful")
      .limit(10000)
      .returns<{ amount_usd: number; platform_fee: number; creator_amount: number }[]>(),
    supabase.from("platform_settings").select("platform_fee").single(),
  ]);
  const monthly = monthlyRaw as { month: string; earnings: number; supporters: number }[] | null;

  const gross = (sums ?? []).reduce((s, t) => s + Number(t.amount_usd), 0);
  const fees = (sums ?? []).reduce((s, t) => s + Number(t.platform_fee), 0);
  const net = (sums ?? []).reduce((s, t) => s + Number(t.creator_amount), 0);
  const months = monthly ?? [];
  const label = (m: string, long = false) =>
    new Date(m).toLocaleString("en-US", { month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: "UTC" });

  return (
    <>
      <PageHeader title="Earnings" description="All amounts in US dollars. Only successful payments count." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross received" value={formatMoney(gross)} icon={Receipt} />
        <StatCard label="Platform fees" value={formatMoney(fees)} hint={`Current rate: ${settings?.platform_fee ?? 0}%`} icon={Percent} />
        <StatCard label="Your earnings" value={formatMoney(net)} icon={Wallet} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Monthly earnings" description="Last 12 months, after platform fee" />
        <div className="p-5">
          <BarChart data={months.map((m) => ({ label: label(m.month), value: Number(m.earnings) }))} format="usd" seriesLabel="Earnings" />
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="By month" />
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-5 py-3 font-medium">Month</th>
              <th className="px-5 py-3 text-right font-medium">Supporters</th>
              <th className="px-5 py-3 text-right font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...months].reverse().map((m) => (
              <tr key={m.month}>
                <td className="px-5 py-3 text-ink">{label(m.month, true)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink-2">{m.supporters}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">{formatMoney(m.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
