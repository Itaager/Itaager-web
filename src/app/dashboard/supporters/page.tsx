import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, maskPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Supporters" };

type Row = { supporter_name: string; supporter_phone: string; creator_amount: number; created_at: string; message: string | null; is_anonymous: boolean };

export default async function SupportersPage() {
  const { creator } = await requireCreator();
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("supporter_name, supporter_phone, creator_amount, created_at, message, is_anonymous")
    .eq("creator_id", creator.id)
    .eq("status", "successful")
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<Row[]>();

  // One row per supporter (identified by phone number).
  const map = new Map<string, { name: string; phone: string; total: number; count: number; last: string; lastMessage: string | null; anonymous: boolean }>();
  for (const t of data ?? []) {
    const s = map.get(t.supporter_phone);
    if (s) {
      s.total += Number(t.creator_amount);
      s.count += 1;
    } else {
      map.set(t.supporter_phone, {
        name: t.supporter_name,
        phone: t.supporter_phone,
        total: Number(t.creator_amount),
        count: 1,
        last: t.created_at,
        lastMessage: t.message,
        anonymous: t.is_anonymous,
      });
    }
  }
  const supporters = [...map.values()].sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader title="Supporters" description={`${supporters.length} people have supported you. Top supporters first.`} />
      <Card>
        {supporters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-medium">Supporter</th>
                  <th className="px-5 py-3 font-medium">Total given</th>
                  <th className="px-5 py-3 font-medium">Payments</th>
                  <th className="px-5 py-3 font-medium">Latest message</th>
                  <th className="px-5 py-3 font-medium">Last support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {supporters.map((s) => (
                  <tr key={s.phone}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size={32} />
                        <div>
                          <p className="font-medium text-ink">{s.name}{s.anonymous && <span className="ml-1.5 text-xs font-normal text-ink-3">(anonymous)</span>}</p>
                          <p className="text-xs text-ink-3">{maskPhone(s.phone)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-ink">{formatMoney(s.total)}</td>
                    <td className="px-5 py-3 tabular-nums text-ink-2">{s.count}</td>
                    <td className="max-w-72 px-5 py-3 text-ink-2"><p className="line-clamp-2">{s.lastMessage ?? "—"}</p></td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-2">{formatDate(s.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title="No supporters yet" description="People who support you will be listed here." />
        )}
      </Card>
    </>
  );
}
