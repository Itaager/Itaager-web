"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { updatePlatformSettings } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Card, CardHeader } from "@/components/ui/misc";
import { platformSettingsSchema } from "@/lib/validation";

type Input = z.input<typeof platformSettingsSchema>;
type Output = z.output<typeof platformSettingsSchema>;

export function PlatformSettingsForm({ defaults }: { defaults: Output }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<Input, unknown, Output>({
    resolver: zodResolver(platformSettingsSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        startTransition(async () => {
          const res = await updatePlatformSettings(v);
          if (res?.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) if (m?.[0]) setError(k as keyof Input, { message: m[0] });
          setResult(res);
        }),
      )}
      className="space-y-6"
    >
      <Card>
        <CardHeader title="General" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Platform name" htmlFor="platformName" error={errors.platformName?.message}>
            <Input id="platformName" {...register("platformName")} />
          </Field>
          <Field label="Support email" htmlFor="supportEmail" error={errors.supportEmail?.message}>
            <Input id="supportEmail" type="email" {...register("supportEmail")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Payments" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Platform fee (%)" htmlFor="platformFee" error={errors.platformFee?.message} hint="Deducted from each successful payment (0–50).">
            <Input id="platformFee" type="number" step="0.1" min={0} max={50} {...register("platformFee")} />
          </Field>
          <Field label="Default currency" htmlFor="defaultCurrency">
            <Select id="defaultCurrency" {...register("defaultCurrency")}>
              <option value="USD">USD</option>
              <option value="SOS">SOS</option>
            </Select>
          </Field>
          <Field label="Exchange rate (SOS per 1 USD)" htmlFor="sosPerUsd" error={errors.sosPerUsd?.message} hint="Used to convert shilling payments and show approximate values.">
            <Input id="sosPerUsd" type="number" step="1" {...register("sosPerUsd")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min amount ($)" htmlFor="minAmountUsd" error={errors.minAmountUsd?.message}>
              <Input id="minAmountUsd" type="number" step="0.5" {...register("minAmountUsd")} />
            </Field>
            <Field label="Max amount ($)" htmlFor="maxAmountUsd" error={errors.maxAmountUsd?.message}>
              <Input id="maxAmountUsd" type="number" step="1" {...register("maxAmountUsd")} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-ink sm:col-span-2">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" {...register("paymentsEnabled")} />
            Accept payments (turn off to pause all new payments for maintenance)
          </label>
        </div>
      </Card>

      <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} disabled={!isDirty}>Save settings</Button>
      </div>
    </form>
  );
}
