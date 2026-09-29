import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { CreatorProfile, Profile } from "./types";

/** Auth user + profile row (profile is null if the database isn't set up or the row is missing). */
const loadAuth = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle<Profile>();
  return { user: data.user, profile };
});

/** Signed-in user + profile for this request (deduped per render). */
export const getSession = cache(async () => {
  const auth = await loadAuth();
  return auth?.profile ? { user: auth.user, profile: auth.profile } : null;
});

export async function requireUser(next = "/dashboard") {
  const auth = await loadAuth();
  if (!auth) redirect(`/login?next=${encodeURIComponent(next)}`);
  // Signed in but no profile: sending them to /login would loop (the proxy
  // sends signed-in users back to /dashboard), so explain instead.
  if (!auth.profile) redirect("/setup-incomplete");
  const session = { user: auth.user, profile: auth.profile };
  if (session.profile.status === "suspended") redirect("/suspended");
  return session;
}

/** Creator routes: signed-in, active creator with a completed creator profile. */
export async function requireCreator() {
  const session = await requireUser("/dashboard");
  if (session.profile.role === "super_admin") redirect("/admin");
  if (session.profile.role === "supporter") redirect("/account");
  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle<CreatorProfile>();
  if (session.profile.role !== "creator" || !creator) redirect("/onboarding");
  return { ...session, creator };
}

/** Admin routes. The database enforces this again through RLS / is_admin(). */
export async function requireAdmin() {
  const session = await requireUser("/admin");
  if (session.profile.role !== "super_admin") redirect("/dashboard");
  return session;
}
