import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { CopyLink } from "@/components/dashboard/copy-link";
import { ExtraLinks } from "@/components/dashboard/extra-links";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Card, CardHeader, PageHeader, Pill } from "@/components/ui/misc";
import { requireCreator } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Page" };

export default async function MyPagePage() {
  const { creator } = await requireCreator();
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("creator_social_links")
    .select("id, platform, url")
    .eq("creator_id", creator.id)
    .order("created_at");

  const url = `${siteUrl}/creator/${creator.username}`;
  const text = encodeURIComponent(`Support my work on Itaager ☕ ${url}`);
  const embed = `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 18px;border-radius:12px;background:#f2a93b;color:#3b2a12;font:600 15px system-ui,sans-serif;text-decoration:none">☕ Support me on Itaager</a>`;

  return (
    <>
      <PageHeader
        title="My Page"
        description="Your public support page and ways to share it."
        action={
          <LinkButton href={`/creator/${creator.username}`} target="_blank" variant="outline">
            Open page <ExternalLink className="size-4" aria-hidden />
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Share your page" description="Put this link anywhere your audience is." />
            <div className="space-y-4 p-5">
              <CopyLink url={url} />
              <div className="flex flex-wrap gap-2">
                <LinkButton variant="outline" size="sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${text}`}>WhatsApp</LinkButton>
                <LinkButton variant="outline" size="sm" target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?text=${text}`}>X / Twitter</LinkButton>
                <LinkButton variant="outline" size="sm" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</LinkButton>
                <LinkButton variant="outline" size="sm" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}`}>Telegram</LinkButton>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Website button" description="Paste this HTML into your website, blog or README." />
            <div className="p-5">
              <pre className="overflow-x-auto rounded-xl bg-surface-2 p-4 text-xs leading-relaxed text-ink-2"><code>{embed}</code></pre>
            </div>
          </Card>

          <Card>
            <CardHeader title="Extra links" description="Add other links (GitHub, YouTube, TikTok, portfolio…)." />
            <ExtraLinks links={links ?? []} />
          </Card>
        </div>

        <Card className="h-fit overflow-hidden">
          <div className="h-20 bg-surface-2" />
          <div className="-mt-9 px-5 pb-5">
            <Avatar src={creator.avatar_url} name={creator.display_name} size={72} className="border-4 border-surface" />
            <p className="mt-2 font-semibold text-ink">{creator.display_name}</p>
            <p className="text-sm text-ink-3">@{creator.username}</p>
            <div className="mt-2"><Pill tone="brand">{creator.category}</Pill></div>
            {creator.bio && <p className="mt-3 line-clamp-4 text-sm text-ink-2">{creator.bio}</p>}
            <LinkButton href="/dashboard/profile" variant="outline" size="sm" className="mt-4 w-full">Edit profile</LinkButton>
          </div>
        </Card>
      </div>
    </>
  );
}
