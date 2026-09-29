import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-bad-soft text-bad">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">Your account is suspended</h1>
        <p className="mt-2 text-sm text-ink-2">
          Your page is hidden and can&apos;t receive payments right now. If you think this is a mistake, contact
          support.
        </p>
        <form action={signOut} className="mt-6">
          <Button variant="outline">Sign out</Button>
        </form>
      </div>
    </div>
  );
}
