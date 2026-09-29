import type { Metadata } from "next";
import { DatabaseZap } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account not ready", robots: { index: false } };

/** Signed-in user without a profile row: usually the database migration hasn't been run. */
export default function SetupIncompletePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8">
        <DatabaseZap className="size-6 text-ink-2" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-ink">Your account isn&apos;t ready yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          You&apos;re signed in, but there&apos;s no profile for your account. This usually means the database tables
          haven&apos;t been created. Run <code className="rounded bg-surface-2 px-1">supabase/migrations/…_init.sql</code> in
          the Supabase SQL Editor, then sign out and create your account again.
        </p>
        <form action={signOut} className="mt-6">
          <Button variant="accent">Sign out</Button>
        </form>
      </div>
    </div>
  );
}
