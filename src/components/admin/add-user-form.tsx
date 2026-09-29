"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { createUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { CATEGORIES, passwordSchema, usernameSchema } from "@/lib/validation";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter a name").max(80),
  username: usernameSchema,
  email: z.email("Enter a valid email"),
  password: passwordSchema,
  role: z.enum(["creator", "supporter", "super_admin"]),
  category: z.string().optional(),
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export function AddUserForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", username: "", email: "", password: "", role: "creator", category: "Other" },
  });
  const role = watch("role");

  if (!open) {
    return (
      <Button variant="accent" onClick={() => { setOpen(true); setResult(null); }}>
        <Plus className="size-4" aria-hidden /> Add user
      </Button>
    );
  }

  return (
    <Card className="mb-6 w-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium text-ink">New account</h2>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) =>
          startTransition(async () => {
            if (v.role === "super_admin" && !confirm(`Give ${v.email} full Super Admin access?`)) return;
            const res = await createUser(v);
            if (res?.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) if (m?.[0]) setError(k as keyof Values, { message: m[0] });
            setResult(res);
            if (res?.ok) reset();
          }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="nu-name" error={errors.fullName?.message}>
            <Input id="nu-name" {...register("fullName")} />
          </Field>
          <Field label="Username" htmlFor="nu-username" error={errors.username?.message}>
            <Input id="nu-username" autoCapitalize="none" {...register("username")} />
          </Field>
          <Field label="Email" htmlFor="nu-email" error={errors.email?.message}>
            <Input id="nu-email" type="email" autoComplete="off" {...register("email")} />
          </Field>
          <Field label="Password" htmlFor="nu-password" error={errors.password?.message} hint="8+ characters with a letter and a number. Share it with the user privately.">
            <Input id="nu-password" type="text" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field label="Role" htmlFor="nu-role">
            <Select id="nu-role" {...register("role")}>
              <option value="creator">Creator</option>
              <option value="supporter">Supporter</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </Field>
          {role === "creator" && (
            <Field label="Category" htmlFor="nu-category">
              <Select id="nu-category" {...register("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          )}
        </div>
        <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="accent" loading={pending}>Create account</Button>
        </div>
      </form>
    </Card>
  );
}
