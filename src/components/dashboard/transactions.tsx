import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/misc";
import { formatDate, formatMoney, maskPhone } from "@/lib/utils";

export { STATUSES, PAGE_SIZE, parseTxFilters, applyTxFilters, type TxRow, type TxFilters } from "@/lib/tx-filters";
import { STATUSES, PAGE_SIZE, type TxRow, type TxFilters } from "@/lib/tx-filters";

export function TxFilterBar({ filters, action, exportHref, hidden }: { filters: TxFilters; action: string; exportHref?: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-b border-line p-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <Input name="q" defaultValue={filters.q} placeholder="Search name, reference…" className="h-10 pl-9" aria-label="Search" />
      </div>
      <Select name="status" defaultValue={filters.status} className="h-10 w-auto" aria-label="Status">
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </Select>
      <Input type="date" name="from" defaultValue={filters.from} className="h-10 w-auto" aria-label="From date" />
      <Input type="date" name="to" defaultValue={filters.to} className="h-10 w-auto" aria-label="To date" />
      <button className={buttonClass("outline", "md", "h-10")}>Filter</button>
      {exportHref && (
        <a href={exportHref} className={buttonClass("outline", "md", "h-10")}>Export CSV</a>
      )}
    </form>
  );
}

export function TxTable({ rows, showCreator, linkBase }: { rows: TxRow[]; showCreator?: boolean; linkBase?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
          <tr>
            <th className="px-4 py-3 font-medium">Supporter</th>
            {showCreator && <th className="px-4 py-3 font-medium">Creator</th>}
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Message</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => (
            <tr key={t.id} className="align-top hover:bg-surface-2/60">
              <td className="px-4 py-3">
                <p className="font-medium text-ink">
                  {t.supporter_name}
                  {t.is_anonymous && <span className="ml-1.5 text-xs font-normal text-ink-3">(anonymous)</span>}
                </p>
                <p className="text-xs text-ink-3">{maskPhone(t.supporter_phone)}</p>
              </td>
              {showCreator && (
                <td className="px-4 py-3 text-ink-2">{t.creator ? `@${t.creator.username}` : "—"}</td>
              )}
              <td className="px-4 py-3 tabular-nums">
                <p className="font-semibold text-ink">{formatMoney(t.amount, t.currency)}</p>
                <p className="text-xs text-ink-3">{linkBase ? "Creator gets" : "You get"} {formatMoney(t.creator_amount)}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className="max-w-64 px-4 py-3 text-ink-2"><p className="line-clamp-2">{t.message ?? <span className="text-ink-3">—</span>}</p></td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-2">{formatDate(t.created_at, true)}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {linkBase ? (
                  <Link href={`${linkBase}/${t.transaction_reference}`} className="text-brand hover:underline">{t.transaction_reference}</Link>
                ) : (
                  <span className="text-ink-2">{t.transaction_reference}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, total, basePath, filters, extra }: { page: number; total: number; basePath: string; filters: TxFilters; extra?: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const sp = new URLSearchParams(extra);
    if (filters.q) sp.set("q", filters.q);
    if (filters.status) sp.set("status", filters.status);
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-2">
      <span>{total} {total === 1 ? "result" : "results"}</span>
      <div className="flex items-center gap-2">
        <Link aria-disabled={page <= 1} href={href(page - 1)} className={buttonClass("outline", "sm", page <= 1 ? "pointer-events-none opacity-40" : "")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
        <span className="tabular-nums">{page} / {pages}</span>
        <Link aria-disabled={page >= pages} href={href(page + 1)} className={buttonClass("outline", "sm", page >= pages ? "pointer-events-none opacity-40" : "")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
