"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Privacy-friendly, first-party analytics. Random IDs only (no cookies, no
// personal data); respects the browser's "Do Not Track" setting.

const OPT_OUT_KEY = "itg_no_track";

function storageGet(store: Storage | undefined, key: string) {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

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

/** Not counted: Do Not Track, local development, and browsers used by admins or creators. */
function trackingDisabled() {
  return (
    navigator.doNotTrack === "1" ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
    storageGet(globalThis.localStorage, OPT_OUT_KEY) === "1"
  );
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ...payload,
    visitorId: id(globalThis.localStorage, "itg_vid"),
    sessionId: id(globalThis.sessionStorage, "itg_sid"),
  });
  if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

/** Readable name for a clicked element: data-track > aria-label > heading inside > text. */
function clickLabel(el: Element) {
  const explicit = (el as HTMLElement).dataset.track || el.getAttribute("aria-label");
  const heading = el.querySelector("h1, h2, h3, h4")?.textContent;
  const text = explicit || heading || el.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

// Guards against the same event being reported twice (re-renders, double handlers).
let lastPageview = { path: "", at: 0 };
let lastClick = { key: "", at: 0 };

export function Analytics() {
  const pathname = usePathname();

  // One page view per page opened (including client-side navigations).
  useEffect(() => {
    if (trackingDisabled()) return;
    const now = Date.now();
    if (lastPageview.path === pathname && now - lastPageview.at < 2000) return;
    const isFirst = lastPageview.at === 0;
    lastPageview = { path: pathname, at: now };
    send({ type: "pageview", path: pathname, referrer: isFirst ? document.referrer || undefined : undefined });
  }, [pathname]);

  // Clicks on links and buttons.
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!ev.isTrusted || trackingDisabled()) return;
      const el = (ev.target as HTMLElement | null)?.closest("a, button");
      if (!el || el.closest("[data-no-track]")) return;
      const label = clickLabel(el);
      const target = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? undefined : undefined;
      const key = `${location.pathname}|${label}|${target}`;
      const now = Date.now();
      if (lastClick.key === key && now - lastClick.at < 1000) return;
      lastClick = { key, at: now };
      send({ type: "click", path: location.pathname, label: label || undefined, target });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

/**
 * Mounted in the admin and creator dashboards: this browser belongs to the team
 * or a creator, so its visits to the public site are not counted.
 */
export function ExcludeFromAnalytics() {
  useEffect(() => {
    try {
      localStorage.setItem(OPT_OUT_KEY, "1");
    } catch {
      // Storage unavailable: nothing to remember.
    }
  }, []);
  return null;
}
