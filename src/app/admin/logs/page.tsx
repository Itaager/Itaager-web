import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AdminActivityLog, PaymentLog } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity logs" };

export default async function LogsPage({ searchParams }: PageProps<"/admin/logs">) {
  await requireAdmin();
  const tab = (await searchParams).tab === "payments" ? "payments" : "admin";
  const supabase = await createClient();

  const tabs = (
    <div className="mb-4 inline-flex rounded-xl bg-surface-2 p-1 text-sm font-medium">
      {[
        { id: "admin", label: "Admin actions" },
        { id: "payments", label: "Payment events" },
      ].map((t) => (
        <Link key={t.id} href={`/admin/logs?tab=${t.id}`} className={cn("rounded-lg px-3 py-1.5", tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (tab === "payments") {
    const { data } = await supabase
      .from("payment_logs")
      .select("*, transaction:transactions(transaction_reference)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<(PaymentLog & { transaction: { transaction_reference: string } | null })[]>();
    return (
      <>
        <PageHeader title="Activity logs" description="Latest 100 payment provider events." />
        {tabs}
        <Card>
          {data && data.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <Pill tone={l.status === "error" || l.status === "failed" ? "bad" : l.status === "successful" ? "good" : "neutral"}>{l.event}</Pill>
                  <span className="text-ink">{l.provider}</span>
                  <span className="text-ink-2">{l.status}</span>
                  {l.error_message && <span className="text-bad">{l.error_message}</span>}
                  {l.transaction && (
                    <Link href={`/admin/transactions/${l.transaction.transaction_reference}`} className="font-mono text-xs text-brand hover:underline">
                      {l.transaction.transaction_reference}
                    </Link>
                  )}
                  <span className="ml-auto text-xs text-ink-3">{formatDate(l.created_at, true)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Activity} title="No payment events yet" />
          )}
        </Card>
      </>
    );
  }

  const { data } = await supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(100).returns<AdminActivityLog[]>();
  const adminIds = [...new Set((data ?? []).map((l) => l.admin_id).filter(Boolean))] as string[];
  const { data: admins } = adminIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", adminIds)
    : { data: [] as { user_id: string; full_name: string }[] };
  const nameOf = new Map((admins ?? []).map((a) => [a.user_id, a.full_name]));

  return (
    <>
      <PageHeader title="Activity logs" description="Latest 100 actions taken by super admins." />
      {tabs}
      <Card>
        {data && data.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Pill tone="brand">{l.action.replaceAll("_", " ")}</Pill>
                <span className="text-ink">{l.description}</span>
                <span className="text-ink-3">by {l.admin_id ? nameOf.get(l.admin_id) ?? "admin" : "system"}</span>
                <span className="ml-auto text-xs text-ink-3">{formatDate(l.created_at, true)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Activity} title="No admin activity yet" />
        )}
      </Card>
    </>
  );
}
