"use client";

import { useState, useTransition } from "react";
import { refundTransaction, setAccountStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AccountStatus } from "@/lib/types";

export function StatusToggle({ userId, status, label }: { userId: string; status: AccountStatus; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const suspend = status === "active";
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={suspend ? "danger" : "primary"}
        loading={pending}
        onClick={() => {
          if (suspend && !confirm(`Suspend ${label}? Their page will be hidden and payments blocked.`)) return;
          startTransition(async () => {
            const res = await setAccountStatus(userId, suspend ? "suspended" : "active");
            setError(res?.ok ? undefined : res?.message);
          });
        }}
      >
        {suspend ? "Suspend" : "Activate"}
      </Button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}

export function RefundButton({ reference, amount }: { reference: string; amount: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        disabled={result?.ok}
        onClick={() => {
          if (!confirm(`Refund ${amount} to the supporter? This cannot be undone.`)) return;
          startTransition(async () => setResult(await refundTransaction(reference)));
        }}
      >
        Refund
      </Button>
      {result && <p className={`text-xs ${result.ok ? "text-good" : "text-bad"}`}>{result.message}</p>}
    </div>
  );
}
