import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { CreatorCard } from "@/components/site/creator-card";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Creators",
  description: "Browse Somali creators on Itaager and support their work with EVC Plus.",
  alternates: { canonical: "/explore" },
};

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.replace(/[^\p{L}\p{N}\s_-]/gu, "").slice(0, 50).trim() : "";
  const category = typeof params.category === "string" && (CATEGORIES as readonly string[]).includes(params.category)
    ? params.category
    : "";

  const supabase = await createClient();
  let query = supabase.from("creator_profiles").select("*").order("total_supporters", { ascending: false }).limit(48);
  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  if (category) query = query.eq("category", category);
  const { data: creators } = await query.returns<CreatorProfile[]>();

  const hrefFor = (c: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (c) sp.set("category", c);
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-5xl font-bold tracking-tight text-ink">Creators</h1>
      <p className="mt-3 text-lg text-ink-2">Find Somali creators you&apos;d like to support.</p>

      <form action="/explore" className="mt-8 flex max-w-xl gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search by name or username" className="h-12 rounded-full pl-10" aria-label="Search creators" />
        </div>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" role="list" aria-label="Categories">
        {["", ...CATEGORIES].map((c) => (
          <Link
            key={c || "all"}
            role="listitem"
            href={hrefFor(c)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              c === category ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink",
            )}
          >
            {c || "All"}
          </Link>
        ))}
      </div>

      {creators && creators.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-line bg-surface">
          <EmptyState icon={Search} title="No creators found" description="Try a different name or category." />
        </div>
      )}
    </div>
  );
}
