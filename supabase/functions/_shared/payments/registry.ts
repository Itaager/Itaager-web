// Chooses the provider implementation for a phone number / provider id.
// Adding Telesom or Somtel = implement PaymentProvider and register it here.

import { HORMUUD_PREFIXES, HormuudProvider } from "./hormuud.ts";
import { SandboxProvider } from "./sandbox.ts";
import { PaymentError, type PaymentProvider, type ProviderId } from "./types.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

function callbackSecret(): string {
  const s = env("PAYMENT_CALLBACK_SECRET");
  if (!s) throw new PaymentError("PAYMENT_CALLBACK_SECRET is not set", "PROVIDER_NOT_CONFIGURED", 503);
  return s;
}

const factories: Record<ProviderId, (() => PaymentProvider) | null> = {
  hormuud: () =>
    env("HORMUUD_MODE") === "live"
      ? new HormuudProvider({
        baseUrl: env("HORMUUD_API_BASE_URL"),
        merchantId: env("HORMUUD_MERCHANT_ID"),
        apiKey: env("HORMUUD_API_KEY"),
      })
      : new SandboxProvider("hormuud", HORMUUD_PREFIXES, callbackSecret()),
  // Future providers — implement PaymentProvider and plug in:
  telesom: null, // ZAAD (63)
  somtel: null, // eDahab (62, 65)
};

export function getProvider(id: ProviderId): PaymentProvider {
  const factory = factories[id];
  if (!factory) {
    throw new PaymentError(`Payment provider "${id}" is not available yet`, "PROVIDER_NOT_CONFIGURED", 503);
  }
  return factory();
}

export function providerForPhone(msisdn: string): PaymentProvider {
  for (const id of Object.keys(factories) as ProviderId[]) {
    if (!factories[id]) continue;
    const provider = getProvider(id);
    if (provider.supportsPhone(msisdn)) return provider;
  }
  throw new PaymentError(
    "Only Hormuud EVC Plus numbers (61 / 77) are supported right now",
    "UNSUPPORTED_PHONE",
  );
}
