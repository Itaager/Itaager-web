import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/dashboard/bar-chart";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

type Month = { month: string; volume: number; revenue: number; transactions: number };

export default async function ReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: monthlyRaw }, { data: top }] = await Promise.all([
    supabase.rpc("admin_monthly_volume", { p_months: 12 }),
    supabase.from("creator_profiles").select("id, display_name, username, total_earnings, total_supporters, total_transactions").order("total_earnings", { ascending: false }).limit(10).returns<CreatorProfile[]>(),
  ]);
  const monthly = monthlyRaw as Month[] | null;
  const months = monthly ?? [];
  const short = (m: string) => new Date(m).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const long = (m: string) => new Date(m).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const totals = months.reduce((a, m) => ({ volume: a.volume + Number(m.volume), revenue: a.revenue + Number(m.revenue), tx: a.tx + Number(m.transactions) }), { volume: 0, revenue: 0, tx: 0 });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Successful payments over the last 12 months, in USD."
        action={
          // Plain link: the CSV is a file download from a route handler, not a page.
          <a href="/admin/transactions/export?status=successful" download className={buttonClass("outline")}>Export successful payments</a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Gross volume" description="Total paid by supporters" />
          <div className="p-5"><BarChart data={months.map((m) => ({ label: short(m.month), value: Number(m.volume) }))} format="usd" seriesLabel="Volume" /></div>
        </Card>
        <Card>
          <CardHeader title="Successful payments" description="Number of payments per month" />
          <div className="p-5"><BarChart data={months.map((m) => ({ label: short(m.month), value: Number(m.transactions) }))} format="count" seriesLabel="Payments" /></div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Monthly summary" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-5 py-3 font-medium">Month</th>
                <th className="px-5 py-3 text-right font-medium">Payments</th>
                <th className="px-5 py-3 text-right font-medium">Volume</th>
                <th className="px-5 py-3 text-right font-medium">Platform revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...months].reverse().map((m) => (
                <tr key={m.month}>
                  <td className="px-5 py-3 text-ink">{long(m.month)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-2">{m.transactions}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink">{formatMoney(m.volume)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">{formatMoney(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-2/60 font-semibold">
              <tr>
                <td className="px-5 py-3 text-ink">12-month total</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink">{totals.tx}</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink">{formatMoney(totals.volume)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink">{formatMoney(totals.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Top creators" description="By total earnings" />
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-line">
            {(top ?? []).map((c, i) => (
              <tr key={c.id}>
                <td className="w-10 px-5 py-3 text-ink-3 tabular-nums">{i + 1}</td>
                <td className="px-2 py-3"><Link href={`/admin/creators/${c.id}`} className="font-medium text-ink hover:text-brand">{c.display_name}</Link> <span className="text-ink-3">@{c.username}</span></td>
                <td className="px-5 py-3 text-right text-ink-2 tabular-nums">{c.total_supporters} supporters</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">{formatMoney(c.total_earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
