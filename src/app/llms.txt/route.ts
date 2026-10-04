import { siteUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// llms.txt — a plain-text summary that AI assistants and answer engines can read
// to explain what Itaager is (https://llmstxt.org).
export const revalidate = 3600;

export async function GET() {
  const { data: pages } = await createPublicClient()
    .from("pages")
    .select("slug, title, meta_description")
    .eq("status", "published")
    .order("sort_order");

  const body = `# Itaager

> Itaager (itaager.com) is a creator-support platform for Somalia. Creators — developers, designers, writers, artists, musicians, educators and students — get a free public page where their audience can support them with small payments using EVC Plus (Hormuud mobile money).

## What Itaager does
- Gives each creator a public support page at ${siteUrl}/creator/<username>.
- Lets supporters choose an amount (for example $1, $3, $5, $10 or a custom amount), add a message, optionally stay anonymous, and pay from their phone with EVC Plus. No card or bank account is needed.
- Verifies every payment on the server with the payment provider before it counts.
- Gives creators a dashboard with earnings, supporters, messages and payment history.
- Reviews new creator pages before they go live.
- Charges no setup or monthly fee; a small platform fee applies only to successful payments.

## Who it is for
- Somali creators who want to be supported by their audience.
- Fans and supporters in Somalia and the Somali diaspora.

## Key pages
- Home: ${siteUrl}/
- Browse creators: ${siteUrl}/explore
- Create a page: ${siteUrl}/register
${(pages ?? []).map((p) => `- ${p.title}: ${siteUrl}/${p.slug}${p.meta_description ? ` — ${p.meta_description}` : ""}`).join("\n")}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
