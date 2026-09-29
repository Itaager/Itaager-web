// Only PUBLIC values live here. The anon/publishable key is safe in the browser
// because every table is protected by Row Level Security. Payment credentials
// and the service-role key exist only as Supabase Edge Function secrets.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const functionsUrl = `${supabaseUrl}/functions/v1`;
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** False until .env.local holds a real project URL and key. */
export const isSupabaseConfigured =
  /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes("YOUR-PROJECT") && supabaseAnonKey.length > 20;

// Until configured, clients get an unreachable local address so they fail
// quietly (queries return errors) instead of throwing on every request.
export const clientUrl = isSupabaseConfigured ? supabaseUrl : "http://127.0.0.1:54321";
export const clientKey = isSupabaseConfigured ? supabaseAnonKey : "not-configured";
