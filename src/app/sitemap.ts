import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const [{ data: creators }, { data: pages }] = await Promise.all([
    supabase.from("creator_profiles").select("username, updated_at").limit(5000),
    supabase.from("pages").select("slug, updated_at").eq("status", "published"),
  ]);

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/register`, changeFrequency: "monthly", priority: 0.6 },
    ...(pages ?? []).map((p) => ({
      url: `${siteUrl}/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: p.slug === "about" ? 0.8 : 0.4,
    })),
    ...(creators ?? []).map((c) => ({
      url: `${siteUrl}/creator/${c.username}`,
      lastModified: c.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
