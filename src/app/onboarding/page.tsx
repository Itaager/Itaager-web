import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatorProfileForm } from "@/components/creator/creator-profile-form";
import { Logo } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { creatorFormDefaults } from "@/lib/creator-defaults";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your page" };

export default async function OnboardingPage() {
  const { user, profile } = await requireUser("/onboarding");
  if (profile.role === "super_admin") redirect("/admin");

  const supabase = await createClient();
  const { data: creator } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (creator) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-brand">Almost done</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Set up your creator page</h1>
        <p className="mt-2 text-ink-2">
          This is what supporters will see at{" "}
          <span className="font-medium text-ink">/creator/{profile.username}</span>. You can change it any time.
        </p>
        <div className="mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <CreatorProfileForm
            userId={user.id}
            defaults={creatorFormDefaults(profile)}
            submitLabel="Publish my page"
            redirectTo="/dashboard?welcome=1"
          />
        </div>
      </main>
    </div>
  );
}
