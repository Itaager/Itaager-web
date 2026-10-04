"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Privacy-friendly, first-party analytics. Random IDs only (no cookies, no
// personal data); respects the browser's "Do Not Track" setting.

function id(store: Storage | undefined, key: string) {
  try {
    let v = store?.getItem(key);
    if (!v) {
      v = crypto.randomUUID();
      store?.setItem(key, v);
    }
    return v;
  } catch {
    return crypto.randomUUID();
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(new URL("/api/track", location.origin), new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  // Page views (including client-side navigations).
  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    send({
      type: "pageview",
      path: pathname,
      referrer: first.current ? document.referrer || undefined : undefined,
      visitorId: id(globalThis.localStorage, "itg_vid"),
      sessionId: id(globalThis.sessionStorage, "itg_sid"),
    });
    first.current = false;
  }, [pathname]);

  // Clicks on links and buttons.
  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest("a, button");
      if (!el || el.closest("[data-no-track]")) return;
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? undefined : undefined;
      send({
        type: "click",
        path: location.pathname,
        label: label || undefined,
        target: href,
        visitorId: id(globalThis.localStorage, "itg_vid"),
        sessionId: id(globalThis.sessionStorage, "itg_sid"),
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
