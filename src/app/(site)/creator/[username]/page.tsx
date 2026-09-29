import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Globe, MapPin, MessageCircleHeart } from "lucide-react";
import { SupportPanel } from "@/components/creator/support-panel";
import { SocialIcon } from "@/components/creator/social-icon";
import { Avatar, Card, EmptyState, Pill } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile, PlatformSettings, PublicSupporter } from "@/lib/types";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";

async function loadCreator(username: string) {
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle<CreatorProfile>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/creator/[username]">): Promise<Metadata> {
  const { username } = await params;
  const creator = await loadCreator(username);
  if (!creator) return { title: "Creator not found" };
  return {
    title: `Support ${creator.display_name}`,
    description: creator.bio ?? `Support ${creator.display_name} on Itaager.`,
    openGraph: { images: creator.avatar_url ? [creator.avatar_url] : [] },
  };
}

export default async function CreatorPage({ params }: PageProps<"/creator/[username]">) {
  const { username } = await params;
  const creator = await loadCreator(username);
  if (!creator) notFound();

  const supabase = await createClient();
  const [{ data: supportersRaw }, { data: settings }, { data: extraLinks }, { data: auth }] = await Promise.all([
    supabase.rpc("get_recent_supporters", { p_username: creator.username, p_limit: 12 }),
    supabase.from("platform_settings").select("*").single<PlatformSettings>(),
    supabase.from("creator_social_links").select("platform, url").eq("creator_id", creator.id),
    supabase.auth.getUser(),
  ]);
  const supporters = supportersRaw as PublicSupporter[] | null;

  const firstName = creator.display_name.split(" ")[0];
  const isOwner = auth.user?.id === creator.user_id;
  const links = [
    { platform: "website", url: creator.website },
    { platform: "twitter", url: creator.twitter },
    { platform: "facebook", url: creator.facebook },
    { platform: "instagram", url: creator.instagram },
    { platform: "linkedin", url: creator.linkedin },
    ...(extraLinks ?? []),
  ].filter((l): l is { platform: string; url: string } => Boolean(l.url));

  return (
    <div>
      {/* Cover */}
      <div className="-mt-32 h-64 bg-gradient-to-b from-brand-soft to-surface-2 sm:-mt-24 sm:h-64">
        {creator.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.cover_url} alt="" className="size-full object-cover" />
        )}
      </div>

      {(creator.approval_status ?? "approved") !== "approved" && (
        <div className="border-b border-warn/30 bg-warn-soft px-4 py-2.5 text-center text-sm text-warn">
          Preview: only you can see this page until an admin approves it.
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="-mt-14 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0">
            <Avatar src={creator.avatar_url} name={creator.display_name} size={112} className="border-4 border-bg" />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {creator.display_name}
              </h1>
              <Pill tone="brand">{creator.category}</Pill>
            </div>
            <p className="mt-1 text-ink-3">@{creator.username}</p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
              {creator.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-ink-3" aria-hidden /> {creator.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4 text-ink-3" aria-hidden /> Joined {formatDate(creator.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircleHeart className="size-4 text-ink-3" aria-hidden />
                {creator.total_supporters} {creator.total_supporters === 1 ? "supporter" : "supporters"}
              </span>
            </div>

            {links.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex size-10 items-center justify-center rounded-md border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                      aria-label={l.platform}
                      title={l.platform}
                    >
                      <SocialIcon platform={l.platform} />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {creator.bio && (
              <Card className="mt-8 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-3">About</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{creator.bio}</p>
              </Card>
            )}

            <Card className="mt-6">
              <div className="border-b border-line px-6 py-4">
                <h2 className="font-semibold text-ink">Recent supporters</h2>
              </div>
              {supporters && supporters.length > 0 ? (
                <ul className="divide-y divide-line">
                  {supporters.map((s) => (
                    <li key={s.id} className="flex gap-3 px-6 py-4">
                      <Avatar name={s.supporter_name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="font-semibold">{s.supporter_name}</span>{" "}
                          <span className="text-ink-2">supported with {formatMoney(s.amount, s.currency)}</span>
                        </p>
                        {s.message && (
                          <p className="mt-1.5 rounded-xl bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink-2">
                            {s.message}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-ink-3">{timeAgo(s.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Globe}
                  title={`Be the first to support ${firstName}`}
                  description="Your name and message will show up here."
                />
              )}
            </Card>
          </div>

          <div className="lg:pt-20">
            <div className="lg:sticky lg:top-24">
              <SupportPanel
                creatorUsername={creator.username}
                creatorFirstName={firstName}
                isOwner={isOwner}
                sosPerUsd={Number(settings?.sos_per_usd ?? 26000)}
                minUsd={Number(settings?.min_amount_usd ?? 0.5)}
                maxUsd={Number(settings?.max_amount_usd ?? 1000)}
                paymentsEnabled={(settings?.payments_enabled ?? true) && (creator.approval_status ?? "approved") === "approved"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
