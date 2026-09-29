import Link from "next/link";
import { Coffee, MapPin, Users } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import type { CreatorProfile } from "@/lib/types";

// Soft cover colours; each creator gets a stable one based on their username.
const COVERS = [
  "from-[#eef5fd] to-[#dcebfb] dark:from-[#1a2738] dark:to-[#15202e]",
  "from-[#f3f8fe] to-[#e3effc] dark:from-[#1c2a3c] dark:to-[#18222f]",
  "from-[#e8f2fd] to-[#f6f9fe] dark:from-[#172434] dark:to-[#1d2836]",
  "from-[#eaf4ff] to-[#d6e8fa] dark:from-[#1b293b] dark:to-[#142030]",
];

function coverFor(username: string) {
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length];
}

export function CreatorCard({ creator }: { creator: CreatorProfile }) {
  const firstName = creator.display_name.split(" ")[0];
  return (
    <Link
      href={`/creator/${creator.username}`}
      className="group flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-3/40 hover:shadow-[0_16px_36px_-18px_rgba(65,137,221,0.45)]"
    >
      <div className={`relative h-24 bg-gradient-to-br ${coverFor(creator.username)}`}>
        {creator.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute right-3 top-3 rounded-full bg-surface/85 px-2.5 py-1 text-xs font-medium text-ink-2 backdrop-blur">
          {creator.category}
        </span>
      </div>

      <div className="relative z-10 -mt-9 flex flex-1 flex-col px-5 pb-5">
        <Avatar src={creator.avatar_url} name={creator.display_name} size={72} className="ring-4 ring-surface" />
        <h3 className="mt-3 truncate text-lg font-semibold tracking-tight text-ink">{creator.display_name}</h3>
        <p className="truncate text-sm text-ink-3">@{creator.username}</p>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-2">
          {creator.bio || `Support ${firstName}'s work on Itaager.`}
        </p>

        <div className="mt-auto pt-5">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {creator.total_supporters} {creator.total_supporters === 1 ? "supporter" : "supporters"}
            </span>
            {creator.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {creator.location}
              </span>
            )}
          </div>
          <span className="flex h-10 items-center justify-center gap-2 rounded-full bg-cta-soft text-sm font-semibold text-cta-strong transition-colors group-hover:bg-cta group-hover:text-white">
            <Coffee className="size-4" aria-hidden />
            Support {firstName}
          </span>
        </div>
      </div>
    </Link>
  );
}
