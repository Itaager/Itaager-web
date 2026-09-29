"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, MailCheck, Sparkles } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput, type RegisterOutput } from "@/lib/validation";

export function RegisterForm({ defaultUsername = "" }: { defaultUsername?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput, unknown, RegisterOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", username: defaultUsername, email: "", password: "", accountType: "creator" },
  });
  const accountType = watch("accountType");
  const username = watch("username");

  const onSubmit = (values: RegisterOutput) =>
    startTransition(async () => {
      setError(undefined);
      const result = await signUp(values);
      if (!result) return;
      if (result.ok) return setDone(result.message);
      if (result.fieldErrors) {
        for (const [key, msgs] of Object.entries(result.fieldErrors)) {
          if (msgs?.[0]) setFieldError(key as keyof RegisterInput, { message: msgs[0] });
        }
      }
      setError(result.message);
    });

  if (done) {
    return (
      <div className="mt-6 text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-good-soft text-good">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <p className="mt-4 font-semibold text-ink">Check your inbox</p>
        <p className="mt-1 text-sm text-ink-2">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {[
          { value: "creator" as const, icon: Sparkles, title: "I'm a creator", text: "Get supported" },
          { value: "supporter" as const, icon: Heart, title: "I'm a supporter", text: "Support others" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={accountType === o.value}
            onClick={() => setValue("accountType", o.value)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              accountType === o.value ? "border-ink bg-surface-2" : "border-line hover:border-ink-3",
            )}
          >
            <o.icon className={cn("size-4.5", accountType === o.value ? "text-ink" : "text-ink-3")} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-ink">{o.title}</p>
            <p className="text-xs text-ink-3">{o.text}</p>
          </button>
        ))}
      </div>

      <FormMessage>{error}</FormMessage>

      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
      </Field>
      <Field
        label="Username"
        htmlFor="username"
        error={errors.username?.message}
        hint={`Your page: itaager.so/creator/${username || "yourname"}`}
      >
        <Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.username)} {...register("username")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
      </Field>

      <Button type="submit" variant="cta" className="w-full" size="lg" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-xs text-ink-3">
        After you confirm your email, you&apos;ll add your photo, bio and links.
      </p>
    </form>
  );
}
