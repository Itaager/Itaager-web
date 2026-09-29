import type { Metadata } from "next";
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PlatformSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: s } = await supabase.from("platform_settings").select("*").single<PlatformSettings>();
  if (!s) return <p className="text-ink-2">Settings row missing. Run the database migration.</p>;

  return (
    <>
      <PageHeader title="Platform settings" description="Changes apply immediately to new payments." />
      <PlatformSettingsForm
        defaults={{
          platformName: s.platform_name,
          supportEmail: s.support_email,
          defaultCurrency: s.default_currency,
          platformFee: Number(s.platform_fee),
          sosPerUsd: Number(s.sos_per_usd),
          minAmountUsd: Number(s.min_amount_usd),
          maxAmountUsd: Number(s.max_amount_usd),
          paymentsEnabled: s.payments_enabled,
        }}
      />
      <Card className="mt-6">
        <CardHeader title="Payment provider" description="Credentials are stored as Supabase Edge Function secrets, never in this app or the database." />
        <div className="space-y-2 p-5 text-sm text-ink-2">
          <p><span className="font-medium text-ink">Hormuud (EVC Plus):</span> set <code className="rounded bg-surface-2 px-1">HORMUUD_MODE</code> to <code className="rounded bg-surface-2 px-1">sandbox</code> or <code className="rounded bg-surface-2 px-1">live</code> with the Supabase CLI.</p>
          <p><span className="font-medium text-ink">Telesom ZAAD and Somtel eDahab:</span> not connected yet. Add a provider class to enable them.</p>
        </div>
      </Card>
    </>
  );
}
