import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string, currency: Currency = "USD") {
  const n = Number(amount);
  if (currency === "SOS") {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)} SOS`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function formatDate(value: string | Date, withTime = false) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function timeAgo(value: string | Date) {
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let v = s;
  for (const [step, unit] of units) {
    if (Math.abs(v) < step) return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-v, unit);
    v = Math.round(v / step);
  }
  return "";
}

/** 61xxxxxxx / 061... / +252 61... -> 25261xxxxxxx, or null. Mirrors the Edge Function. */
export function normalizeSomaliPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local = digits;
  if (local.startsWith("252")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  return /^[67]\d{8}$/.test(local) ? `252${local}` : null;
}

export function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return `+${phone.slice(0, 5)} ••• ${phone.slice(-2)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
