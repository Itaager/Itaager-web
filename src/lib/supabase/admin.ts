import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses RLS — use only in server code after an
 * explicit authorization check (e.g. requireAdmin / adminContext).
 * The key has no NEXT_PUBLIC_ prefix, so it is never bundled for the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
