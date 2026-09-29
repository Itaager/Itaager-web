// Hormuud (EVC Plus) live provider.
//
// Intentionally NOT implemented against any guessed endpoints: the official
// Hormuud merchant API documentation and credentials are required. When you
// receive them:
//   1. Put credentials in Supabase secrets (never in the Next.js app):
//        supabase secrets set HORMUUD_MERCHANT_ID=... HORMUUD_API_KEY=... \
//          HORMUUD_API_BASE_URL=... HORMUUD_MODE=live
//   2. Implement the four methods below following the official docs.
//   3. Keep secrets out of the `raw` payloads (they are stored in payment_logs).
//
// Until then HORMUUD_MODE defaults to "sandbox" and SandboxProvider is used.

import {
  type CallbackEvent,
  type CreatePaymentInput,
  type CreatePaymentResult,
  PaymentError,
  type PaymentProvider,
  type RefundInput,
  type RefundResult,
  type StatusQuery,
  type StatusResult,
} from "./types.ts";

export const HORMUUD_PREFIXES = ["61", "77"];

export interface HormuudConfig {
  baseUrl: string;
  merchantId: string;
  apiKey: string;
}

export class HormuudProvider implements PaymentProvider {
  readonly id = "hormuud" as const;
  readonly mode = "live" as const;

  constructor(private readonly config: HormuudConfig) {
    if (!config.baseUrl || !config.merchantId || !config.apiKey) {
      throw new PaymentError(
        "Hormuud live mode is enabled but credentials are missing",
        "PROVIDER_NOT_CONFIGURED",
        503,
      );
    }
  }

  supportsPhone(msisdn: string): boolean {
    return HORMUUD_PREFIXES.some((p) => msisdn.startsWith(`252${p}`));
  }

  private notImplemented(): never {
    throw new PaymentError(
      "Hormuud live integration is pending official API documentation",
      "PROVIDER_NOT_CONFIGURED",
      503,
    );
  }

  createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return this.notImplemented();
  }

  checkPaymentStatus(_query: StatusQuery): Promise<StatusResult> {
    return this.notImplemented();
  }

  parseCallback(_req: Request, _rawBody: string): Promise<CallbackEvent> {
    return this.notImplemented();
  }

  processRefund(_input: RefundInput): Promise<RefundResult> {
    return this.notImplemented();
  }
}
