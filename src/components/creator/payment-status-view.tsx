"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Copy, Loader2, RotateCcw, Smartphone, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { fetchPaymentStatus } from "@/lib/payments";
import type { Currency, TransactionStatus } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

interface Props {
  reference: string;
  initialStatus: TransactionStatus;
  amount: number;
  currency: Currency;
  creatorUsername: string;
  creatorName: string;
  createdAt: string;
}

const OPEN: TransactionStatus[] = ["pending", "processing"];
const POLL_MS = 3000;
const GIVE_UP_MS = 16 * 60_000;

export function PaymentStatusView({ reference, initialStatus, amount, currency, creatorUsername, creatorName, createdAt }: Props) {
  const [status, setStatus] = useState<TransactionStatus>(initialStatus);
  const [copied, setCopied] = useState(false);
  const open = OPEN.includes(status);

  // Poll the server (which verifies with the provider) until a final state.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const started = Date.now();
    const tick = async () => {
      if (cancelled || Date.now() - started > GIVE_UP_MS) return;
      const next = await fetchPaymentStatus(reference);
      if (cancelled) return;
      if (next) setStatus(next);
      if (!next || OPEN.includes(next)) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, reference]);

  const money = formatMoney(amount, currency);
  const view = {
    pending: { icon: Loader2, spin: true, tone: "text-brand bg-brand-soft", title: "Starting your payment…", text: "Hold on a moment." },
    processing: {
      icon: Smartphone, spin: false, tone: "text-brand bg-brand-soft",
      title: "Check your phone",
      text: `Approve the EVC Plus prompt for ${money} and enter your PIN. This page updates on its own.`,
    },
    successful: { icon: CheckCircle2, spin: false, tone: "text-good bg-good-soft", title: `Thank you for supporting ${creatorName}!`, text: `Your ${money} payment went through.` },
    failed: { icon: XCircle, spin: false, tone: "text-bad bg-bad-soft", title: "Payment failed", text: "The payment didn't go through. Check your balance and try again. You have not been charged." },
    cancelled: { icon: Ban, spin: false, tone: "text-ink-2 bg-surface-2", title: "Payment cancelled", text: "The payment was cancelled on your phone. No money was taken." },
    refunded: { icon: RotateCcw, spin: false, tone: "text-ink-2 bg-surface-2", title: "Payment refunded", text: "This payment has been refunded to your account." },
  }[status];
  const Icon = view.icon;

  return (
    <Card className="p-8 text-center" aria-live="polite">
      <span className={`mx-auto inline-flex size-16 items-center justify-center rounded-full ${view.tone}`}>
        <Icon className={`size-8 ${view.spin ? "animate-spin" : ""}`} aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-ink">{view.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{view.text}</p>

      {status === "processing" && (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-ink-3">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Waiting for confirmation
        </p>
      )}

      <dl className="mt-8 divide-y divide-line rounded-xl border border-line text-left text-sm">
        <Row label="Amount" value={money} />
        <Row label="Creator" value={creatorName} />
        <Row label="Date" value={formatDate(createdAt, true)} />
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-ink-3">Reference</dt>
          <dd className="flex items-center gap-2 font-mono text-xs text-ink">
            {reference}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(reference);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-ink-3 hover:text-ink"
              aria-label="Copy reference"
            >
              {copied ? <CheckCircle2 className="size-4 text-good" /> : <Copy className="size-4" />}
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <LinkButton href={`/creator/${creatorUsername}`} variant={status === "successful" ? "outline" : "accent"}>
          {status === "successful" ? `Back to ${creatorName.split(" ")[0]}'s page` : "Try again"}
        </LinkButton>
        {status === "successful" && <LinkButton href="/explore" variant="ghost">Discover more creators</LinkButton>}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
