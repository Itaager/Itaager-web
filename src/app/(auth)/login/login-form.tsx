"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/validation";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(notice);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) =>
    startTransition(async () => {
      setError(undefined);
      const result = await signIn(values, next); // redirects on success
      if (result && !result.ok) setError(result.message);
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
      <FormMessage>{error}</FormMessage>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">Forgot password?</Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Sign in</Button>
    </form>
  );
}
