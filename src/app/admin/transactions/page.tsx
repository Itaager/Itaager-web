import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, X } from "lucide-react";
import { applyTxFilters, PAGE_SIZE, Pagination, parseTxFilters, TxFilterBar, TxTable, type TxRow } from "@/components/dashboard/transactions";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminTransactionsPage({ searchParams }: PageProps<"/admin/transactions">) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseTxFilters(sp);
  const creatorId = typeof sp.creator === "string" && /^[0-9a-f-]{36}$/i.test(sp.creator) ? sp.creator : "";
  const extra: Record<string, string> = creatorId ? { creator: creatorId } : {};

  const supabase = await createClient();
  const from = (filters.page - 1) * PAGE_SIZE;
  let query = applyTxFilters(
    supabase.from("transactions").select("*, creator:creator_profiles(username, display_name)", { count: "exact" }),
    filters,
    ["supporter_name", "transaction_reference", "supporter_phone", "supporter_email", "provider_transaction_id"],
  );
  if (creatorId) query = query.eq("creator_id", creatorId);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1).returns<TxRow[]>();

  const exportParams = new URLSearchParams(extra);
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);

  return (
    <>
      <PageHeader title="Payments" description="Search by supporter name, phone, email or reference." />
      {creatorId && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
          Filtered to one creator
          <Link href="/admin/transactions" aria-label="Clear creator filter"><X className="size-4" /></Link>
        </div>
      )}
      <Card>
        <TxFilterBar filters={filters} action="/admin/transactions" hidden={extra} exportHref={`/admin/transactions/export?${exportParams}`} />
        {data && data.length > 0 ? (
          <>
            <TxTable rows={data} showCreator linkBase="/admin/transactions" />
            <Pagination page={filters.page} total={count ?? 0} basePath="/admin/transactions" filters={filters} extra={extra} />
          </>
        ) : (
          <EmptyState icon={CreditCard} title="No transactions found" description="Try changing the filters." />
        )}
      </Card>
    </>
  );
}
