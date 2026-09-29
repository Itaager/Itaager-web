import type { Metadata } from "next";
import { AccountNameForm, ChangePasswordForm } from "@/components/dashboard/settings-forms";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireCreator();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("platform_settings").select("platform_fee, support_email").single();

  return (
    <>
      <PageHeader title="Settings" description="Your account and security." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" />
          <div className="space-y-5 p-5">
            <AccountNameForm fullName={profile.full_name} />
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-ink-3">Email</dt><dd className="mt-1 font-medium text-ink">{profile.email}</dd></div>
              <div><dt className="text-ink-3">Username</dt><dd className="mt-1 font-medium text-ink">@{profile.username}</dd></div>
              <div><dt className="text-ink-3">Member since</dt><dd className="mt-1 font-medium text-ink">{formatDate(profile.created_at)}</dd></div>
            </dl>
            <p className="text-xs text-ink-3">To change your username or email, contact {settings?.support_email ?? "support"}.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Password" description="Use at least 8 characters with a letter and a number." />
          <div className="p-5"><ChangePasswordForm /></div>
        </Card>

        <Card>
          <CardHeader title="Fees" />
          <p className="p-5 text-sm text-ink-2">
            Itaager keeps <span className="font-semibold text-ink">{settings?.platform_fee ?? 0}%</span> of each successful
            payment. Failed or cancelled payments are free. Your earnings shown in the dashboard are already after this fee.
          </p>
        </Card>
      </div>
    </>
  );
}
