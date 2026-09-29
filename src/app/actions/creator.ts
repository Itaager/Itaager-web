"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { normalizeSomaliPhone } from "@/lib/utils";
import { creatorProfileSchema, sanitize, type CreatorProfileInput } from "@/lib/validation";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Avatars must live in this project's public bucket, inside the user's own folder. */
function ownAvatarUrl(url: string | undefined, userId: string) {
  if (!url) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`;
  return url.startsWith(base) ? url : null;
}

export async function saveCreatorProfile(input: CreatorProfileInput): Promise<ActionState> {
  const parsed = creatorProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, message: "Your session expired. Please sign in again." };

  const { data: profile } = await supabase.from("profiles").select("role, status, username").eq("user_id", user.id).single();
  if (!profile || profile.status !== "active") return { ok: false, message: "Your account is not active." };
  if (profile.role === "super_admin") return { ok: false, message: "Admin accounts cannot have a creator page." };

  const avatarUrl = ownAvatarUrl(v.avatarUrl, user.id);
  const creatorFields = {
    display_name: v.displayName,
    bio: v.bio || null,
    category: v.category,
    avatar_url: avatarUrl,
    location: v.location || null,
    website: v.website,
    twitter: v.twitter,
    facebook: v.facebook,
    instagram: v.instagram,
    linkedin: v.linkedin,
  };

  // Private account details (phone is never shown publicly).
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone: v.phone ? normalizeSomaliPhone(v.phone) : null,
      location: v.location || null,
      avatar_url: avatarUrl,
      bio: v.bio ? v.bio.slice(0, 300) : null,
      ...(profile.role === "supporter" ? { role: "creator" } : {}),
    })
    .eq("user_id", user.id);
  if (profileError) return { ok: false, message: "Could not save your account details." };

  const { data: existing } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("creator_profiles").update(creatorFields).eq("user_id", user.id)
    : await supabase.from("creator_profiles").insert({ ...creatorFields, user_id: user.id, username: profile.username });
  if (error) return { ok: false, message: "Could not save your creator page. Please try again." };

  revalidatePath(`/creator/${profile.username}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Your page has been saved." };
}

const socialLinkSchema = z.object({
  platform: z.string().transform(sanitize).pipe(z.string().min(2).max(30)),
  url: z.url({ protocol: /^https?$/ }).max(300),
});

export async function addSocialLink(input: { platform: string; url: string }): Promise<ActionState> {
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const { data: creator } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).single();
  if (!creator) return { ok: false, message: "Create your page first." };
  const { count } = await supabase.from("creator_social_links").select("id", { count: "exact", head: true }).eq("creator_id", creator.id);
  if ((count ?? 0) >= 10) return { ok: false, message: "You can add up to 10 extra links." };

  // RLS guarantees creator_id belongs to the caller.
  const { error } = await supabase.from("creator_social_links").insert({ creator_id: creator.id, ...parsed.data });
  if (error) return { ok: false, message: "Could not add link." };
  revalidatePath("/dashboard/page");
  return { ok: true };
}

export async function removeSocialLink(id: string): Promise<ActionState> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { supabase } = await currentUser();
  const { error } = await supabase.from("creator_social_links").delete().eq("id", id);
  revalidatePath("/dashboard/page");
  return { ok: !error };
}

export async function updateAccountName(input: { fullName: string }): Promise<ActionState> {
  const name = sanitize(String(input.fullName ?? ""));
  if (name.length < 2 || name.length > 80) return { ok: false, fieldErrors: { fullName: ["Enter 2–80 characters"] } };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("user_id", user.id);
  revalidatePath("/dashboard/settings");
  return error ? { ok: false, message: "Could not save." } : { ok: true, message: "Saved." };
}
