import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { applyTxFilters, PAGE_SIZE, Pagination, parseTxFilters, TxFilterBar, TxTable, type TxRow } from "@/components/dashboard/transactions";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/dashboard/payments">) {
  const { creator } = await requireCreator();
  const filters = parseTxFilters(await searchParams);
  const supabase = await createClient();

  const from = (filters.page - 1) * PAGE_SIZE;
  const query = applyTxFilters(
    supabase.from("transactions").select("*", { count: "exact" }).eq("creator_id", creator.id),
    filters,
    ["supporter_name", "transaction_reference", "message"],
  );
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1).returns<TxRow[]>();

  return (
    <>
      <PageHeader title="Payments" description="Every payment made to your page, including pending and failed ones." />
      <Card>
        <TxFilterBar filters={filters} action="/dashboard/payments" />
        {data && data.length > 0 ? (
          <>
            <TxTable rows={data} />
            <Pagination page={filters.page} total={count ?? 0} basePath="/dashboard/payments" filters={filters} />
          </>
        ) : (
          <EmptyState icon={CreditCard} title="No payments found" description="Try changing the filters." />
        )}
      </Card>
    </>
  );
}
