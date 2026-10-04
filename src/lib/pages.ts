import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { CmsPage } from "./types";

/** A published page by slug (RLS hides drafts from the public). */
export const getPublishedPage = cache(async (slug: string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<CmsPage>();
  return data;
});

/** Published pages shown in the site footer. */
export const getFooterPages = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("status", "published")
    .eq("show_in_footer", true)
    .order("sort_order")
    .order("title");
  return (data ?? []) as Pick<CmsPage, "slug" | "title">[];
});
