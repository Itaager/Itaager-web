"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveCreatorProfile } from "@/app/actions/creator";
import { AvatarUpload } from "@/components/creator/avatar-upload";
import { SocialIcon } from "@/components/creator/social-icon";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORIES, creatorProfileSchema, type CreatorProfileInput, type CreatorProfileOutput } from "@/lib/validation";

interface Props {
  userId: string;
  defaults: CreatorProfileInput;
  submitLabel: string;
  redirectTo?: string;
}

const SOCIALS = [
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/you" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/you" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/you" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
] as const;

export function CreatorProfileForm({ userId, defaults, submitLabel, redirectTo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreatorProfileInput, unknown, CreatorProfileOutput>({ resolver: zodResolver(creatorProfileSchema), defaultValues: defaults });

  const onSubmit = (values: CreatorProfileOutput) =>
    startTransition(async () => {
      const res = await saveCreatorProfile(values);
      if (!res) return;
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) if (m?.[0]) setError(k as keyof CreatorProfileInput, { message: m[0] });
      }
      setResult(res);
      if (res.ok && redirectTo) router.push(redirectTo);
      else if (res.ok) router.refresh();
    });

  const bio = watch("bio") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="space-y-5">
        <AvatarUpload
          userId={userId}
          name={watch("displayName")}
          value={watch("avatarUrl")}
          onChange={(url) => setValue("avatarUrl", url, { shouldDirty: true })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
            <Input id="displayName" aria-invalid={Boolean(errors.displayName)} {...register("displayName")} />
          </Field>
          <Field label="Category" htmlFor="category" error={errors.category?.message}>
            <Select id="category" {...register("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Short bio" htmlFor="bio" error={errors.bio?.message} hint={`${bio.length}/500. Tell supporters what you make and why their support matters.`}>
          <Textarea id="bio" rows={4} maxLength={500} aria-invalid={Boolean(errors.bio)} {...register("bio")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location" htmlFor="location" error={errors.location?.message} optional>
            <Input id="location" placeholder="Mogadishu, Somalia" {...register("location")} />
          </Field>
          <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} optional hint="Private. Only you and admins can see it.">
            <Input id="phone" type="tel" inputMode="tel" placeholder="61 234 5678" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Social links</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label} htmlFor={s.key} error={errors[s.key]?.message} optional>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">
                  <SocialIcon platform={s.key} className="size-4" />
                </span>
                <Input id={s.key} type="url" placeholder={s.placeholder} className="pl-10" aria-invalid={Boolean(errors[s.key])} {...register(s.key)} />
              </div>
            </Field>
          ))}
        </div>
      </section>

      <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} disabled={!isDirty && !redirectTo}>{submitLabel}</Button>
      </div>
    </form>
  );
}
