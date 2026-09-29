"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { functionsUrl, supabaseAnonKey } from "@/lib/supabase/env";
import type { ActionState, AccountStatus, CreatorApproval } from "@/lib/types";
import { CATEGORIES, passwordSchema, platformSettingsSchema, sanitize, usernameSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every admin action re-checks the role; RLS enforces it again in the DB. */
async function adminContext() {
  const session = await getSession();
  if (!session || session.profile.role !== "super_admin" || session.profile.status !== "active") {
    throw new Error("Forbidden");
  }
  return { supabase: await createClient(), adminId: session.user.id };
}

async function logAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
) {
  await supabase.from("admin_activity_logs").insert({ admin_id: adminId, action, entity_type: entityType, entity_id: entityId, description });
}

export async function setAccountStatus(userId: string, status: AccountStatus): Promise<ActionState> {
  if (!z.uuid().safeParse(userId).success || !["active", "suspended"].includes(status)) return { ok: false, message: "Invalid request" };
  const { supabase, adminId } = await adminContext();
  if (userId === adminId) return { ok: false, message: "You can't change your own status." };

  const { data: target, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("user_id", userId)
    .select("username, role")
    .single();
  if (error || !target) return { ok: false, message: error?.message ?? "User not found" };

  await logAction(
    supabase, adminId,
    status === "suspended" ? "suspend_account" : "activate_account",
    target.role === "creator" ? "creator" : "user",
    userId,
    `${status === "suspended" ? "Suspended" : "Activated"} @${target.username}`,
  );
  revalidatePath("/admin", "layout");
  revalidatePath(`/creator/${target.username}`);
  return { ok: true, message: status === "suspended" ? "Account suspended." : "Account activated." };
}

export async function updatePlatformSettings(input: z.input<typeof platformSettingsSchema>): Promise<ActionState> {
  const parsed = platformSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  if (v.minAmountUsd >= v.maxAmountUsd) return { ok: false, fieldErrors: { maxAmountUsd: ["Must be greater than the minimum"] } };

  const { supabase, adminId } = await adminContext();
  const { data: current } = await supabase.from("platform_settings").select("id").single();
  if (!current) return { ok: false, message: "Settings row missing" };

  const { error } = await supabase
    .from("platform_settings")
    .update({
      platform_name: v.platformName,
      support_email: v.supportEmail,
      default_currency: v.defaultCurrency,
      platform_fee: v.platformFee,
      sos_per_usd: v.sosPerUsd,
      min_amount_usd: v.minAmountUsd,
      max_amount_usd: v.maxAmountUsd,
      payments_enabled: v.paymentsEnabled,
    })
    .eq("id", current.id);
  if (error) return { ok: false, message: error.message };

  await logAction(supabase, adminId, "update_settings", "platform_settings", current.id,
    `Fee ${v.platformFee}%, 1 USD = ${v.sosPerUsd} SOS, limits $${v.minAmountUsd}–$${v.maxAmountUsd}, payments ${v.paymentsEnabled ? "on" : "off"}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function refundTransaction(reference: string): Promise<ActionState> {
  if (!/^ITG-[A-Z2-9-]{19}$/.test(reference)) return { ok: false, message: "Invalid reference" };
  const { supabase } = await adminContext();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ok: false, message: "Session expired" };

  // Refunds go through the Edge Function, which holds the provider credentials.
  const res = await fetch(`${functionsUrl}/admin-refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseAnonKey, Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ reference }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: body.error ?? "Refund failed" };
  revalidatePath(`/admin/transactions/${reference}`);
  return { ok: true, message: "Payment refunded." };
}

export interface NewUserInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: "creator" | "supporter" | "super_admin";
  category?: string;
}

const newUserSchema = z.object({
  fullName: z.string().transform(sanitize).pipe(z.string().min(2, "Enter a name").max(80)),
  username: usernameSchema,
  email: z.email("Enter a valid email").max(120),
  password: passwordSchema,
  role: z.enum(["creator", "supporter", "super_admin"]),
  category: z.enum(CATEGORIES).optional(),
});

/** Creates a confirmed account (email + password) for a super admin. */
export async function createUser(input: NewUserInput): Promise<ActionState> {
  const { supabase, adminId } = await adminContext();
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const { data: available } = await supabase.rpc("username_available", { p_username: v.username });
  if (!available) return { ok: false, fieldErrors: { username: ["That username is taken"] } };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };
  }

  // Admin-created accounts are confirmed immediately (no verification email).
  const { data: created, error } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: v.fullName, username: v.username, account_type: v.role === "creator" ? "creator" : "supporter" },
  });
  if (error || !created.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return taken
      ? { ok: false, fieldErrors: { email: ["An account with this email already exists"] } }
      : { ok: false, message: error?.message ?? "Could not create the account" };
  }
  const userId = created.user.id;

  // The signup trigger created the profile; promote or add a creator page as requested.
  if (v.role === "super_admin") {
    await admin.from("profiles").update({ role: "super_admin" }).eq("user_id", userId);
  }
  if (v.role === "creator") {
    const { data: profile } = await admin.from("profiles").select("username").eq("user_id", userId).single();
    await admin.from("creator_profiles").insert({
      user_id: userId,
      display_name: v.fullName,
      username: profile?.username ?? v.username,
      category: v.category ?? "Other",
      // Created by an admin, so no separate review step.
      approval_status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    });
  }

  await logAction(supabase, adminId, "create_user", "user", userId, `Created ${v.role.replace("_", " ")} @${v.username} (${v.email})`);
  revalidatePath("/admin", "layout");
  revalidatePath("/explore");
  return { ok: true, message: `Account created. They can sign in now with ${v.email}.` };
}

/** Approve or reject a creator page. The database function re-checks admin rights and logs it. */
export async function reviewCreator(creatorId: string, decision: Exclude<CreatorApproval, "pending">, note?: string): Promise<ActionState> {
  if (!z.uuid().safeParse(creatorId).success || !["approved", "rejected"].includes(decision)) return { ok: false, message: "Invalid request" };
  const { supabase } = await adminContext();
  const { data, error } = await supabase
    .rpc("admin_review_creator", { p_creator_id: creatorId, p_decision: decision, p_note: note?.slice(0, 500) ?? null })
    .single<{ username: string }>();
  if (error || !data) return { ok: false, message: error?.message ?? "Could not update creator" };
  revalidatePath("/admin", "layout");
  revalidatePath(`/creator/${data.username}`);
  revalidatePath("/explore");
  return { ok: true, message: decision === "approved" ? "Creator approved. Their page is now live." : "Creator rejected." };
}
