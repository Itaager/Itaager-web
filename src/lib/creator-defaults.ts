import type { CreatorProfile, Profile } from "./types";
import { CATEGORIES, type CreatorProfileInput } from "./validation";

export function creatorFormDefaults(profile: Profile, creator?: CreatorProfile | null): CreatorProfileInput {
  const category = (CATEGORIES as readonly string[]).includes(creator?.category ?? "")
    ? (creator!.category as CreatorProfileInput["category"])
    : "Other";
  return {
    displayName: creator?.display_name ?? profile.full_name,
    bio: creator?.bio ?? profile.bio ?? "",
    category,
    phone: profile.phone ? `+${profile.phone}` : "",
    location: creator?.location ?? profile.location ?? "",
    avatarUrl: creator?.avatar_url ?? profile.avatar_url ?? "",
    website: creator?.website ?? "",
    twitter: creator?.twitter ?? "",
    facebook: creator?.facebook ?? "",
    instagram: creator?.instagram ?? "",
    linkedin: creator?.linkedin ?? "",
  };
}
