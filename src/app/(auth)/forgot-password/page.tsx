"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { forgotPasswordSchema } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-2">We&apos;ll email you a link to choose a new password.</p>
      <form
        onSubmit={handleSubmit((v) => startTransition(async () => setResult(await requestPasswordReset(v))))}
        className="mt-6 space-y-4"
        noValidate
      >
        <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>Send reset link</Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
