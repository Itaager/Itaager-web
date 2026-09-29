"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { reviewCreator } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { CreatorApproval } from "@/lib/types";

export function ReviewButtons({ creatorId, name, status }: { creatorId: string; name: string; status: CreatorApproval }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (decision: "approved" | "rejected") => {
    let note: string | undefined;
    if (decision === "rejected") {
      const answer = prompt(`Reason for rejecting ${name}? (shown to the creator, optional)`);
      if (answer === null) return;
      note = answer;
    }
    startTransition(async () => {
      const res = await reviewCreator(creatorId, decision, note);
      setError(res?.ok ? undefined : res?.message);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {status !== "approved" && (
          <Button size="sm" variant="accent" loading={pending} onClick={() => run("approved")}>
            <Check className="size-3.5" aria-hidden /> Approve
          </Button>
        )}
        {status !== "rejected" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("rejected")}>
            <X className="size-3.5" aria-hidden /> {status === "approved" ? "Unpublish" : "Reject"}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}

export function ApprovalPill({ status }: { status: CreatorApproval }) {
  const map = {
    pending: "bg-warn-soft text-warn",
    approved: "bg-good-soft text-good",
    rejected: "bg-bad-soft text-bad",
  } as const;
  const label = { pending: "Pending review", approved: "Approved", rejected: "Rejected" }[status];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{label}</span>;
}
