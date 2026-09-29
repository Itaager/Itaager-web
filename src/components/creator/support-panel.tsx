"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { createPayment } from "@/lib/payments";
import type { Currency } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { PRESET_AMOUNTS_USD, supportSchema, type SupportInput, type SupportOutput } from "@/lib/validation";

interface Props {
  creatorUsername: string;
  creatorFirstName: string;
  isOwner: boolean;
  sosPerUsd: number;
  minUsd: number;
  maxUsd: number;
  paymentsEnabled: boolean;
}

/** Round shilling presets to a friendly 5,000 step. */
const toSos = (usd: number, rate: number) => Math.max(5000, Math.round((usd * rate) / 5000) * 5000);

export function SupportPanel({ creatorUsername, creatorFirstName, isOwner, sosPerUsd, minUsd, maxUsd, paymentsEnabled }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  // One key per payment attempt: network retries reuse it (idempotent), a
  // definitive server answer rotates it.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupportInput, unknown, SupportOutput>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      amount: 3,
      currency: "USD",
      supporterName: "",
      supporterEmail: "",
      phone: "",
      message: "",
      isAnonymous: false,
    },
  });

  const amount = watch("amount");
  const currency = watch("currency") as Currency;
  const anonymous = watch("isAnonymous");

  const presets = useMemo(
    () => PRESET_AMOUNTS_USD.map((usd) => (currency === "USD" ? usd : toSos(usd, sosPerUsd))),
    [currency, sosPerUsd],
  );

  const amountUsd = currency === "USD" ? Number(amount) : Number(amount) / sosPerUsd;
  const outOfRange = Number.isFinite(amountUsd) && amount > 0 && (amountUsd < minUsd || amountUsd > maxUsd);

  function switchCurrency(next: Currency) {
    if (next === currency) return;
    setValue("currency", next);
    const i = presets.indexOf(Number(amount));
    const usd = i >= 0 ? PRESET_AMOUNTS_USD[i] : 3;
    setValue("amount", next === "USD" ? usd : toSos(usd, sosPerUsd), { shouldValidate: true });
    setCustom(false);
  }

  async function onSubmit(values: SupportOutput) {
    setServerError(null);
    if (outOfRange) return;
    try {
      const result = await createPayment({
        idempotencyKey: idempotencyKey.current,
        creatorUsername,
        amount: Number(values.amount),
        currency: values.currency,
        supporterName: values.isAnonymous && !values.supporterName ? "Anonymous" : values.supporterName,
        supporterEmail: values.supporterEmail || null,
        phone: values.phone,
        message: values.message || null,
        isAnonymous: values.isAnonymous,
      });
      router.push(`/pay/${result.reference}`);
    } catch (err) {
      const e = err as Error & { retryable?: boolean };
      if (!e.retryable) idempotencyKey.current = crypto.randomUUID();
      setServerError(e.message);
    }
  }

  if (isOwner) {
    return (
      <Card className="p-6 text-center">
        <Coffee className="mx-auto size-8 text-accent" aria-hidden />
        <p className="mt-3 font-semibold text-ink">This is your page</p>
        <p className="mt-1 text-sm text-ink-2">Share this link with your audience so they can support you.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-cta-soft px-6 py-5">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <Coffee className="size-6 text-ink-2" aria-hidden />
          Support {creatorFirstName}
        </h2>
        <p className="mt-1 text-sm text-ink-2">Pick an amount and approve it on your phone.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6" noValidate>
        {!paymentsEnabled && (
          <FormMessage>Payments are paused for maintenance. Please try again later.</FormMessage>
        )}

        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium text-ink">Amount</legend>
            <div className="inline-flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold" role="radiogroup" aria-label="Currency">
              {(["USD", "SOS"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => switchCurrency(c)}
                  className={cn("rounded-md px-2.5 py-1", currency === c ? "bg-surface text-ink shadow-sm" : "text-ink-3")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {presets.map((value) => {
              const active = !custom && Number(amount) === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCustom(false);
                    setValue("amount", value, { shouldValidate: true });
                  }}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold tabular-nums transition-colors",
                    active ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-ink-3",
                  )}
                >
                  {currency === "USD" ? `$${value}` : `${value / 1000}k`}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setCustom(true)}
            className={cn("mt-2 text-sm font-medium", custom ? "text-brand" : "text-ink-2 hover:text-ink")}
          >
            {custom ? "Custom amount" : "+ Enter a custom amount"}
          </button>
          {custom && (
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">
                {currency === "USD" ? "$" : "SOS"}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step={currency === "USD" ? "0.5" : "1000"}
                min={0}
                autoFocus
                aria-label="Custom amount"
                className={currency === "USD" ? "pl-7" : "pl-12"}
                aria-invalid={Boolean(errors.amount) || outOfRange}
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
          )}
          <p className={cn("mt-2 text-xs", outOfRange || errors.amount ? "text-bad" : "text-ink-3")}>
            {errors.amount?.message ??
              (outOfRange
                ? `Amount must be between ${formatMoney(minUsd)} and ${formatMoney(maxUsd)}.`
                : currency === "SOS"
                  ? `≈ ${formatMoney(amountUsd || 0)} · 1 USD ≈ ${formatMoney(sosPerUsd, "SOS")}`
                  : `≈ ${formatMoney(Math.round((amountUsd || 0) * sosPerUsd), "SOS")}`)}
          </p>
        </fieldset>

        <Field label="EVC Plus number" htmlFor="phone" error={errors.phone?.message} hint="You'll get a prompt on this phone to confirm.">
          <div className="relative">
            <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="61 234 5678"
              className="pl-10"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              {...register("phone")}
            />
          </div>
        </Field>

        <Field label="Your name" htmlFor="supporterName" error={errors.supporterName?.message} optional={anonymous}>
          <Input
            id="supporterName"
            autoComplete="name"
            placeholder="e.g. Ayaan Ali"
            aria-invalid={Boolean(errors.supporterName)}
            {...register("supporterName")}
          />
        </Field>

        <Field label="Email" htmlFor="supporterEmail" error={errors.supporterEmail?.message} optional hint="Never shown on the public page.">
          <Input id="supporterEmail" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.supporterEmail)} {...register("supporterEmail")} />
        </Field>

        <Field label="Message" htmlFor="message" error={errors.message?.message} optional>
          <Textarea id="message" rows={3} maxLength={500} placeholder={`Say something nice to ${creatorFirstName}…`} {...register("message")} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" className="size-4 rounded accent-[var(--brand)]" {...register("isAnonymous")} />
          Support anonymously (hide my name on this page)
        </label>

        <FormMessage>{serverError}</FormMessage>

        <Button type="submit" variant="cta" size="lg" className="w-full" loading={isSubmitting} disabled={!paymentsEnabled || outOfRange}>
          <Coffee className="size-5" aria-hidden />
          Support {amount > 0 ? formatMoney(amount, currency) : ""}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-3">
          <Lock className="size-3.5" aria-hidden /> Secured with Hormuud EVC Plus. We never see your PIN.
        </p>
      </form>
    </Card>
  );
}
