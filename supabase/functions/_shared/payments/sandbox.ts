// Sandbox provider: simulates a mobile-money push payment WITHOUT calling any
// external API. Used until official Hormuud credentials/docs are available.
//
// Deterministic test numbers (last 4 digits of the phone):
//   ...0000  -> payment fails (insufficient balance)
//   ...1111  -> supporter cancels on the handset
//   anything else -> succeeds ~6 seconds after creation
//
// The simulated outcome is encoded in the provider transaction id so the
// provider stays stateless.

import { hmacHex, timingSafeEqual } from "../crypto.ts";
import {
  type CallbackEvent,
  type CreatePaymentInput,
  type CreatePaymentResult,
  PaymentError,
  type PaymentProvider,
  type ProviderId,
  type RefundInput,
  type RefundResult,
  type StatusQuery,
  type StatusResult,
} from "./types.ts";

const APPROVAL_DELAY_MS = 6_000;

type Outcome = "OK" | "FAIL" | "CANCEL";

export class SandboxProvider implements PaymentProvider {
  readonly mode = "sandbox" as const;

  constructor(
    readonly id: ProviderId,
    private readonly prefixes: string[],
    private readonly callbackSecret: string,
  ) {}

  supportsPhone(msisdn: string): boolean {
    return this.prefixes.some((p) => msisdn.startsWith(`252${p}`));
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const outcome: Outcome = input.phone.endsWith("0000")
      ? "FAIL"
      : input.phone.endsWith("1111")
      ? "CANCEL"
      : "OK";
    const providerTransactionId = `SBX-${outcome}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      status: "processing",
      providerTransactionId,
      customerMessage:
        "Sandbox mode: no real money is charged. The payment will be confirmed in a few seconds.",
      raw: { sandbox: true, providerTransactionId, amount: input.amount, currency: input.currency },
    };
  }

  async checkPaymentStatus(query: StatusQuery): Promise<StatusResult> {
    const id = query.providerTransactionId ?? "";
    const elapsed = Date.now() - new Date(query.createdAt).getTime();
    if (elapsed < APPROVAL_DELAY_MS) {
      return { status: "processing", providerTransactionId: id, raw: { sandbox: true, elapsed } };
    }
    const status = id.startsWith("SBX-FAIL")
      ? "failed"
      : id.startsWith("SBX-CANCEL")
      ? "cancelled"
      : id.startsWith("SBX-OK")
      ? "successful"
      : "failed";
    return { status, providerTransactionId: id, raw: { sandbox: true, elapsed, status } };
  }

  // Sandbox callbacks are signed with HMAC-SHA256(raw body, PAYMENT_CALLBACK_SECRET)
  // in the "x-signature" header. Useful for testing the callback pipeline.
  async parseCallback(req: Request, rawBody: string): Promise<CallbackEvent> {
    const signature = req.headers.get("x-signature") ?? "";
    const expected = await hmacHex(this.callbackSecret, rawBody);
    if (!signature || !timingSafeEqual(signature, expected)) {
      throw new PaymentError("Invalid callback signature", "INVALID_CALLBACK", 401);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new PaymentError("Malformed callback body", "INVALID_CALLBACK");
    }
    const reference = String(body.reference ?? "");
    const claimed = String(body.status ?? "");
    if (!reference || !["successful", "failed", "cancelled"].includes(claimed)) {
      throw new PaymentError("Missing callback fields", "INVALID_CALLBACK");
    }
    return {
      reference,
      providerTransactionId: body.providerTransactionId ? String(body.providerTransactionId) : null,
      claimedStatus: claimed as CallbackEvent["claimedStatus"],
      raw: body,
    };
  }

  async processRefund(input: RefundInput): Promise<RefundResult> {
    return { ok: true, raw: { sandbox: true, refunded: input.reference } };
  }
}
