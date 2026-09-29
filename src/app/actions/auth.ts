"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import type { ActionState } from "@/lib/types";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation";

/** Only allow same-site relative redirects. */
function safeNext(next: unknown, fallback: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}

export async function signUp(input: RegisterInput): Promise<ActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: available } = await supabase.rpc("username_available", { p_username: v.username });
  if (!available) return { ok: false, fieldErrors: { username: ["That username is taken"] } };

  const { error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${v.accountType === "creator" ? "/onboarding" : "/account"}`,
      // account_type is limited to creator|supporter by the database trigger.
      data: { full_name: v.fullName, username: v.username, account_type: v.accountType },
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `We sent a confirmation link to ${v.email}. Open it to activate your account.` };
}

export async function signIn(input: LoginInput, next?: string): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      message: error.code === "email_not_confirmed" ? "Please confirm your email first. Check your inbox." : "Incorrect email or password.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("user_id", data.user.id)
    .single();

  if (profile?.status === "suspended") redirect("/suspended");
  const home = profile?.role === "super_admin" ? "/admin" : profile?.role === "creator" ? "/dashboard" : "/account";
  // Non-admins can never be sent into /admin.
  const target = safeNext(next, home);
  redirect(target.startsWith("/admin") && profile?.role !== "super_admin" ? home : target);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(input: { email: string }): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Same answer whether or not the account exists (no user enumeration).
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(input: { password: string; confirm: string }): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated." };
}
