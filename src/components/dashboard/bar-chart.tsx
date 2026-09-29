"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  label: string;
  value: number;
}

/** Single-series bar chart: one hue, no legend (the card title names it). */
export function BarChart({ data, format, seriesLabel }: { data: Point[]; format: "usd" | "count"; seriesLabel: string }) {
  const fmt = (v: number) =>
    format === "usd"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v < 100 ? 2 : 0 }).format(v)
      : new Intl.NumberFormat("en-US").format(v);
  const axisFmt = (v: number) =>
    format === "usd" ? `$${new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)}` : new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);

  return (
    <div className="h-64 w-full" role="img" aria-label={`${seriesLabel} by month`}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} dy={6} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: "var(--ink-3)", fontSize: 12 }} tickFormatter={axisFmt} allowDecimals={format === "usd"} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                  <p className="text-ink-3">{label}</p>
                  <p className="mt-0.5 font-semibold text-ink tabular-nums">
                    {seriesLabel}: {fmt(Number(payload[0].value))}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" name={seriesLabel} fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </RBarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>{seriesLabel} by month</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{fmt(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
