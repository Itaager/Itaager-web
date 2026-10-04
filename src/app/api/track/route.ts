import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { lookupGeo } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";

// First-party analytics collector: page views and clicks from the public site.
// Stores country/region/city, device and browser — never the IP address.

const eventSchema = z.object({
  type: z.enum(["pageview", "click"]),
  path: z.string().startsWith("/").max(300),
  label: z.string().max(200).optional(),
  target: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  visitorId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  sessionId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/).optional(),
});

const PRIVATE_PATHS = /^\/(admin|dashboard|account|onboarding|api|auth)(\/|$)/;
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;

// Simple per-process rate limit: 120 events per IP per minute.
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  return ++h.n > 120;
}

function clientIp(req: NextRequest) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function parseUa(ua: string) {
  const device = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Other";
  return { device, browser, os };
}

/** Keep only the referring site's host; drop our own domain (internal navigation). */
function referrerHost(ref: string | undefined) {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    const own = new URL(siteUrl).hostname.replace(/^www\./, "");
    return host && host !== own && host !== "localhost" ? host : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

  const ip = clientIp(req);
  if (ip && limited(ip)) return new NextResponse(null, { status: 429 });

  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;
  if (PRIVATE_PATHS.test(e.path)) return new NextResponse(null, { status: 204 });

  const [geo, { device, browser, os }] = [await lookupGeo(ip), parseUa(ua)];

  try {
    await createAdminClient().from("analytics_events").insert({
      type: e.type,
      path: e.path.split("?")[0],
      label: e.label?.trim().slice(0, 200) || null,
      target: e.target?.slice(0, 300) || null,
      referrer: e.type === "pageview" ? referrerHost(e.referrer) : null,
      visitor_id: e.visitorId,
      session_id: e.sessionId ?? null,
      ...geo,
      device,
      browser,
      os,
    });
  } catch {
    // Analytics must never break the site.
  }
  return new NextResponse(null, { status: 204 });
}
