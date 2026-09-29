"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addSocialLink, removeSocialLink } from "@/app/actions/creator";
import { SocialIcon } from "@/components/creator/social-icon";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";

export function ExtraLinks({ links }: { links: { id: string; platform: string; url: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();

  return (
    <div className="p-5">
      {links.length > 0 && (
        <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <SocialIcon platform={l.platform} className="size-4 text-ink-3" />
              <span className="font-medium text-ink">{l.platform}</span>
              <span className="min-w-0 flex-1 truncate text-ink-3">{l.url}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await removeSocialLink(l.id)))}
                className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-bad-soft hover:text-bad"
                aria-label={`Remove ${l.platform} link`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          startTransition(async () => {
            const res = await addSocialLink({ platform, url });
            if (res?.ok) {
              setPlatform("");
              setUrl("");
            } else {
              setError(res?.message ?? "Enter a name (e.g. GitHub) and a full URL starting with https://");
            }
          });
        }}
      >
        <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="GitHub" className="sm:w-40" aria-label="Link name" maxLength={30} />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/you" type="url" aria-label="Link URL" />
        <Button type="submit" variant="outline" loading={pending}><Plus className="size-4" aria-hidden /> Add</Button>
      </form>
      <div className="mt-3"><FormMessage>{error}</FormMessage></div>
    </div>
  );
}
