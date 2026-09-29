import type { Transaction, TransactionStatus } from "@/lib/types";

export const STATUSES: TransactionStatus[] = ["pending", "processing", "successful", "failed", "cancelled", "refunded"];
export const PAGE_SIZE = 20;

export type TxRow = Transaction & { creator?: { username: string; display_name: string } | null };

export interface TxFilters {
  q: string;
  status: TransactionStatus | "";
  from: string;
  to: string;
  page: number;
}

/** Parses and sanitises list filters from searchParams. */
export function parseTxFilters(sp: Record<string, string | string[] | undefined>): TxFilters {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = str("status") as TransactionStatus;
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  return {
    q: str("q").replace(/[^\p{L}\p{N}\s@._-]/gu, "").slice(0, 60).trim(),
    status: STATUSES.includes(status) ? status : "",
    from: date(str("from")),
    to: date(str("to")),
    page: Math.max(1, Math.min(500, Number.parseInt(str("page")) || 1)),
  };
}

/** Applies filters to a Supabase query builder on `transactions`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTxFilters<Q extends { or: any; eq: any; gte: any; lt: any }>(query: Q, f: TxFilters, searchCols: string[]): Q {
  let q = query;
  if (f.q) q = q.or(searchCols.map((c) => `${c}.ilike.%${f.q}%`).join(","));
  if (f.status) q = q.eq("status", f.status);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00Z`);
  if (f.to) {
    const end = new Date(`${f.to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    q = q.lt("created_at", end.toISOString());
  }
  return q;
}
