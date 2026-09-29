import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RefundButton } from "@/components/admin/admin-buttons";
import type { TxRow } from "@/components/dashboard/transactions";
import { Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentLog } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaction" };

export default async function AdminTransactionPage({ params }: PageProps<"/admin/transactions/[reference]">) {
  await requireAdmin();
  const { reference } = await params;
  if (!/^ITG-[A-Z2-9-]{19}$/.test(reference)) notFound();

  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("transactions")
    .select("*, creator:creator_profiles(id, username, display_name)")
    .eq("transaction_reference", reference)
    .maybeSingle<TxRow & { creator: { id: string; username: string; display_name: string } }>();
  if (!tx) notFound();

  const { data: logs } = await supabase
    .from("payment_logs")
    .select("*")
    .eq("transaction_id", tx.id)
    .order("created_at", { ascending: true })
    .returns<PaymentLog[]>();

  const rows: [string, React.ReactNode][] = [
    ["Reference", <span key="r" className="font-mono">{tx.transaction_reference}</span>],
    ["Status", <StatusBadge key="s" status={tx.status} />],
    ["Amount", `${formatMoney(tx.amount, tx.currency)}${tx.currency !== "USD" ? ` (${formatMoney(tx.amount_usd)})` : ""}`],
    ["Platform fee", formatMoney(tx.platform_fee)],
    ["Creator receives", formatMoney(tx.creator_amount)],
    ["Creator", <Link key="c" href={`/admin/creators/${tx.creator.id}`} className="text-brand hover:underline">{tx.creator.display_name} (@{tx.creator.username})</Link>],
    ["Supporter", `${tx.supporter_name}${tx.is_anonymous ? " (anonymous on page)" : ""}`],
    ["Phone", `+${tx.supporter_phone}`],
    ["Email", tx.supporter_email ?? "—"],
    ["Provider", tx.payment_provider],
    ["Provider transaction ID", <span key="p" className="font-mono">{tx.provider_transaction_id ?? "—"}</span>],
    ["Created", formatDate(tx.created_at, true)],
    ["Completed", tx.completed_at ? formatDate(tx.completed_at, true) : "—"],
  ];

  return (
    <>
      <Link href="/admin/transactions" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Transactions
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="Payment details"
            action={tx.status === "successful" ? <RefundButton reference={tx.transaction_reference} amount={formatMoney(tx.amount, tx.currency)} /> : undefined}
          />
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {tx.message && (
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-ink-3">Message</p>
              <p className="mt-1.5 text-sm text-ink">{tx.message}</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Provider log" description="Requests and responses. Credentials are never stored." />
          {logs && logs.length > 0 ? (
            <ol className="divide-y divide-line">
              {logs.map((l) => (
                <li key={l.id} className="px-5 py-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold capitalize text-ink">{l.event}</span>
                    <span className="text-xs text-ink-3">{formatDate(l.created_at, true)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-2">Status: {l.status ?? "—"}{l.error_message ? ` · ${l.error_message}` : ""}</p>
                  {(l.request_data != null || l.response_data != null) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-brand">Show payload</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
                        {JSON.stringify({ request: l.request_data, response: l.response_data }, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No provider events" />
          )}
        </Card>
      </div>
    </>
  );
}
