import { Settings2 } from "lucide-react";

/** Shown instead of the app until .env.local has the Supabase URL and key. */
export function SetupRequired() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Settings2 className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">Connect Supabase to continue</h1>
        <p className="mt-2 text-sm text-ink-2">
          Itaager needs your Supabase project URL and anon key. Add them to <code className="rounded bg-surface-2 px-1">.env.local</code> in the
          project folder, then restart <code className="rounded bg-surface-2 px-1">npm run dev</code>.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl bg-surface-2 p-4 text-xs leading-relaxed text-ink">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
        </pre>
        <p className="mt-4 text-xs text-ink-3">
          Find both values in the Supabase dashboard under Project Settings → API. Then run the database migration
          (<code>supabase db push</code>) as described in the README.
        </p>
      </div>
    </div>
  );
}
