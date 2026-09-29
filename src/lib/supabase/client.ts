import { createBrowserClient } from "@supabase/ssr";
import { clientKey, clientUrl } from "./env";

export function createClient() {
  return createBrowserClient(clientUrl, clientKey);
}
