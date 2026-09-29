import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Currency, TransactionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My account" };

type Row = {
  id: string;
  transaction_reference: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  created_at: string;
  creator: { username: string; display_name: string } | null;
};

/** Home for supporter accounts: their support history + become a creator. */
export default async function AccountPage() {
  const { user, profile } = await requireUser("/account");
  if (profile.role === "super_admin") redirect("/admin");
  if (profile.role === "creator") redirect("/dashboard");

  const supabase = await createClient();
  const { data: history } = await supabase
    .from("transactions")
    .select("id, transaction_reference, amount, currency, status, created_at, creator:creator_profiles(username, display_name)")
    .eq("supporter_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Row[]>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Hi, {profile.full_name.split(" ")[0]}</h1>
          <p className="mt-1 text-ink-2">Thanks for supporting Somali creators.</p>
        </div>
        <form action={signOut}><Button variant="outline" size="sm">Sign out</Button></form>
      </div>

      <Card className="mt-8 flex flex-col items-start gap-4 bg-accent-soft p-6 sm:flex-row sm:items-center">
        <Sparkles className="size-8 text-accent-strong" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold text-ink">Do you make things too?</p>
          <p className="text-sm text-ink-2">Turn your account into a creator page and start receiving support.</p>
        </div>
        <LinkButton href="/onboarding" variant="accent">Become a creator</LinkButton>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Your support history" />
        {history && history.length > 0 ? (
          <ul className="divide-y divide-line">
            {history.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <Link href={`/creator/${t.creator?.username}`} className="font-medium text-ink hover:text-brand">
                    {t.creator?.display_name}
                  </Link>
                  <p className="text-xs text-ink-3">{formatDate(t.created_at, true)} · {t.transaction_reference}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-ink">{formatMoney(t.amount, t.currency)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Heart} title="No support yet" description="When you support a creator while logged in, it shows up here." action={<LinkButton href="/explore" variant="outline" size="sm">Explore creators</LinkButton>} />
        )}
      </Card>
    </div>
  );
}
