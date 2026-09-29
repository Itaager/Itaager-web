"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@/app/actions/auth";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { resetPasswordSchema } from "@/lib/validation";

type Values = { password: string; confirm: string };

export default function ResetPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(resetPasswordSchema),
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Choose a new password</h1>
      {result?.ok ? (
        <div className="mt-6 space-y-4">
          <FormMessage ok>{result.message}</FormMessage>
          <LinkButton href="/dashboard" className="w-full" size="lg">Go to dashboard</LinkButton>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((v) => startTransition(async () => setResult(await updatePassword(v))))}
          className="mt-6 space-y-4"
          noValidate
        >
          <FormMessage>{result?.message}</FormMessage>
          <Field label="New password" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
            <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...register("confirm")} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={pending}>Update password</Button>
        </form>
      )}
    </>
  );
}
