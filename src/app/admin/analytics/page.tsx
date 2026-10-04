import type { Metadata } from "next";
import Link from "next/link";
import { Eye, MousePointerClick, Repeat, Users } from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

type Row = { name: string; visitors?: number; views?: number; clicks?: number; path?: string; target?: string };
type Stats = {
  pageviews: number;
  visitors: number;
  sessions: number;
  clicks: number;
  daily: { day: string; pageviews: number; visitors: number }[];
  pages: Row[];
  countries: Row[];
  regions: Row[];
  cities: Row[];
  referrers: Row[];
  devices: Row[];
  browsers: Row[];
  top_clicks: Row[];
};

const RANGES = [7, 30, 90] as const;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "Unknown";
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return `${flag}  ${regionNames.of(code) ?? code}`;
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const requested = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_analytics", { p_days: days });
  const s = data as Stats | null;
  const n = (v: number | undefined) => new Intl.NumberFormat("en-US").format(Number(v ?? 0));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Visitors to the public website. Locations are approximate; IP addresses are never stored."
        action={
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?days=${r}`} className={cn("rounded-md px-3 py-1.5 font-medium", r === days ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      {error || !s ? (
        <Card>
          <EmptyState
            title="Analytics isn't set up yet"
            description="Run the database migration 20261004000003_pages_analytics.sql in Supabase, then refresh this page."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Unique visitors" value={n(s.visitors)} icon={Users} />
            <StatCard label="Page views" value={n(s.pageviews)} icon={Eye} />
            <StatCard label="Visits" value={n(s.sessions)} hint="Browser sessions" icon={Repeat} />
            <StatCard label="Clicks" value={n(s.clicks)} hint="Links and buttons" icon={MousePointerClick} />
          </div>

          <Card className="mt-6">
            <CardHeader title="Page views per day" description={`Last ${days} days`} />
            <div className="p-5">
              <BarChart
                data={s.daily.map((d) => ({
                  label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
                  value: Number(d.pageviews),
                }))}
                format="count"
                seriesLabel="Page views"
              />
            </div>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <RankList title="Top pages" rows={s.pages} metric="views" unit="views" render={(r) => <span className="font-mono text-[13px]">{r.name}</span>} />
            <RankList title="Countries" rows={s.countries} metric="visitors" unit="visitors" render={(r) => countryLabel(r.name)} />
            <RankList title="Regions" rows={s.regions} metric="visitors" unit="visitors" />
            <RankList title="Cities" rows={s.cities} metric="visitors" unit="visitors" />
            <RankList title="Traffic sources" rows={s.referrers} metric="visitors" unit="visitors" />
            <RankList title="Most clicked" rows={s.top_clicks} metric="clicks" unit="clicks" render={(r) => (
              <span>
                {r.name}
                <span className="ml-2 text-xs text-ink-3">on {r.path}</span>
              </span>
            )} />
            <RankList title="Devices" rows={s.devices} metric="visitors" unit="visitors" />
            <RankList title="Browsers" rows={s.browsers} metric="visitors" unit="visitors" />
          </div>
        </>
      )}
    </>
  );
}

function RankList({
  title,
  rows,
  metric,
  unit,
  render,
}: {
  title: string;
  rows: Row[];
  metric: "visitors" | "views" | "clicks";
  unit: string;
  render?: (r: Row) => React.ReactNode;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[metric] ?? 0)));
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-3">No data yet</p>
      ) : (
        <ul className="space-y-1 p-3">
          {rows.map((r, i) => {
            const v = Number(r[metric] ?? 0);
            return (
              <li key={`${r.name}-${i}`} className="relative overflow-hidden rounded-md px-3 py-2 text-sm">
                <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-brand-soft" style={{ width: `${(v / max) * 100}%` }} />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-ink">{render ? render(r) : r.name}</span>
                  <span className="shrink-0 tabular-nums text-ink-2" title={`${v} ${unit}`}>{new Intl.NumberFormat("en-US").format(v)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
