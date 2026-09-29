"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@/app/actions/auth";
import { updateAccountName } from "@/app/actions/creator";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { resetPasswordSchema } from "@/lib/validation";

type Result = { ok: boolean; message?: string } | null;

export function AccountNameForm({ fullName }: { fullName: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(null);
  const [value, setValue] = useState(fullName);
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setResult(await updateAccountName({ fullName: value })));
      }}
    >
      <Field label="Full name" htmlFor="fullName" className="flex-1">
        <Input id="fullName" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} />
      </Field>
      <Button type="submit" variant="outline" loading={pending} disabled={value === fullName}>Save</Button>
      {result && <div className="sm:hidden"><FormMessage ok={result.ok}>{result.message}</FormMessage></div>}
    </form>
  );
}

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(resetPasswordSchema),
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        startTransition(async () => {
          const res = await updatePassword(v);
          setResult(res);
          if (res?.ok) reset({ password: "", confirm: "" });
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>
      </div>
      <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>Update password</Button>
      </div>
    </form>
  );
}
