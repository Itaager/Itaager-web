import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientKey, clientUrl } from "./env";

/** Cookie-less anon client for public, cacheable data (sitemap, llms.txt). RLS applies. */
export function createPublicClient() {
  return createClient(clientUrl, clientKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
