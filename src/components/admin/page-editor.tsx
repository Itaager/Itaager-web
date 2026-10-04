"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { deletePage, savePage } from "@/app/actions/pages";
import { Markdown } from "@/components/site/markdown";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { pageSchema } from "@/lib/page-schema";
import { cn } from "@/lib/utils";

type Input = z.input<typeof pageSchema>;
type Output = z.output<typeof pageSchema>;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function PageEditor({ defaults }: { defaults: Input }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.id));
  const isNew = !defaults.id;

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isDirty } } = useForm<Input, unknown, Output>({
    resolver: zodResolver(pageSchema),
    defaultValues: defaults,
  });
  const content = watch("content") ?? "";
  const slug = watch("slug");
  const status = watch("status");

  const onSubmit = (v: Output) =>
    startTransition(async () => {
      const res = await savePage(v);
      if (res?.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) if (m?.[0]) setError(k as keyof Input, { message: m[0] });
      setResult(res);
      if (res?.ok && isNew && res.id) router.replace(`/admin/pages/${res.id}`);
      else if (res?.ok) router.refresh();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <Field label="Page name" htmlFor="title" error={errors.title?.message}>
          <Input
            id="title"
            placeholder="Terms & Conditions"
            className="h-12 text-lg font-semibold"
            {...register("title", {
              onChange: (e) => {
                if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </Field>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-2">
            <div className="flex">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "border-b-2 px-3 py-2.5 text-sm font-medium capitalize",
                    tab === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="px-2 text-xs text-ink-3">Markdown · {content.length.toLocaleString()} characters</span>
          </div>
          {tab === "write" ? (
            <Textarea
              aria-label="Page content"
              rows={22}
              className="min-h-[480px] rounded-none border-0 font-mono text-[13px] focus:ring-0"
              placeholder={"## Heading\n\nWrite your text here. Use **bold**, lists:\n\n- item one\n- item two\n\nand links: [Contact](/contact)"}
              {...register("content")}
            />
          ) : (
            <div className="min-h-[480px] px-6 py-6">
              {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-ink-3">Nothing to preview yet.</p>}
            </div>
          )}
        </Card>
        {errors.content?.message && <p className="text-xs text-bad">{errors.content.message}</p>}
        <details className="text-xs text-ink-3">
          <summary className="cursor-pointer">Formatting help</summary>
          <p className="mt-2 leading-relaxed">
            <code>## Heading</code> · <code>### Smaller heading</code> · <code>**bold**</code> · <code>*italic*</code> ·{" "}
            <code>- list item</code> · <code>1. numbered</code> · <code>[link text](https://…)</code> · <code>&gt; note box</code>
          </p>
        </details>
      </div>

      <aside className="space-y-5">
        <Card className="space-y-4 p-5">
          <Field label="Status" htmlFor="status">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1" id="status">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue("status", s, { shouldDirty: true })}
                  className={cn("rounded-md py-1.5 text-sm font-medium capitalize", status === s ? "bg-surface text-ink shadow-sm" : "text-ink-3")}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Address" htmlFor="slug" error={errors.slug?.message} hint={`itaager.com/${slug || "…"}`}>
            <Input id="slug" {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
          <Field label="Search description" htmlFor="metaDescription" error={errors.metaDescription?.message} hint="Shown by Google under the page title (up to 300 characters).">
            <Textarea id="metaDescription" rows={3} maxLength={300} {...register("metaDescription")} />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" {...register("showInFooter")} />
            Show in the website footer
          </label>
          <Field label="Order in footer" htmlFor="sortOrder" error={errors.sortOrder?.message}>
            <Input id="sortOrder" type="number" min={0} max={999} className="w-24" {...register("sortOrder")} />
          </Field>

          <FormMessage ok={result?.ok}>{result?.message}</FormMessage>
          <Button type="submit" variant="accent" className="w-full" loading={pending} disabled={!isDirty && !isNew}>
            {status === "published" ? "Save & publish" : "Save draft"}
          </Button>
          {!isNew && status === "published" && (
            <a href={`/${defaults.slug}`} target="_blank" className="flex items-center justify-center gap-1.5 text-sm text-ink-2 hover:text-ink">
              View page <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </Card>

        {!isNew && (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-bad hover:bg-bad-soft hover:text-bad"
            onClick={() => {
              if (confirm("Delete this page? This cannot be undone.")) startTransition(() => deletePage(defaults.id!));
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Delete page
          </Button>
        )}
      </aside>
    </form>
  );
}
