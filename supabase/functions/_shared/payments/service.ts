// PaymentService: orchestrates providers, the database and audit logging.
// The frontend never sets a payment status — only this service does, and only
// after asking the provider (verifyPayment) or authenticating its callback.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { generateReference, sha256Hex } from "../crypto.ts";
import { getProvider, providerForPhone } from "./registry.ts";
import {
  type Currency,
  PaymentError,
  type PaymentProvider,
  type ProviderId,
  type ProviderStatus,
} from "./types.ts";

/** Pending payments older than this are closed as failed. */
const PAYMENT_TIMEOUT_MS = 15 * 60_000;

const RATE_LIMITS = {
  perIpPer10Min: 10,
  perPhonePer10Min: 5,
  openPerPhone: 2,
};

export interface NewPaymentRequest {
  idempotencyKey: string;
  creatorUsername: string;
  amount: number;
  currency: Currency;
  supporterName: string;
  supporterEmail: string | null;
  phone: string; // normalised 252XXXXXXXXX
  message: string | null;
  isAnonymous: boolean;
  supporterUserId: string | null;
  clientIp: string;
}

type TxRow = {
  id: string;
  transaction_reference: string;
  status: string;
  payment_provider: string;
  provider_transaction_id: string | null;
  created_at: string;
  amount: number;
  currency: Currency;
};

const TERMINAL = new Set(["successful", "failed", "cancelled", "refunded"]);

export class PaymentService {
  constructor(private readonly db: SupabaseClient) {}

  // ---------------------------------------------------------------------------
  async createPayment(req: NewPaymentRequest) {
    // 1. Idempotency: same key -> same transaction, provider is not called twice.
    const existing = await this.db
      .from("transactions")
      .select("transaction_reference, status")
      .eq("idempotency_key", req.idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      return { reference: existing.data.transaction_reference, status: existing.data.status, duplicate: true };
    }

    // 2. Platform settings + creator must be active.
    const { data: settings } = await this.db.from("platform_settings").select("*").single();
    if (!settings?.payments_enabled) {
      throw new PaymentError("Payments are temporarily disabled", "PROVIDER_NOT_CONFIGURED", 503);
    }

    const { data: creator } = await this.db
      .from("creator_profiles")
      .select("id, user_id, display_name, username, approval_status")
      .eq("username", req.creatorUsername.toLowerCase())
      .maybeSingle();
    if (!creator) throw new PaymentError("Creator not found", "PROVIDER_ERROR", 404);
    if (creator.approval_status !== "approved") {
      throw new PaymentError("This creator page is not live yet", "PROVIDER_ERROR", 403);
    }

    const { data: owner } = await this.db
      .from("profiles")
      .select("status")
      .eq("user_id", creator.user_id)
      .single();
    if (owner?.status !== "active") {
      throw new PaymentError("This creator is not accepting support right now", "PROVIDER_ERROR", 403);
    }
    if (req.supporterUserId && req.supporterUserId === creator.user_id) {
      throw new PaymentError("You cannot support your own page", "PROVIDER_ERROR", 400);
    }

    // 3. Amount limits (all limits are defined in USD).
    const sosRate = Number(settings.sos_per_usd);
    const amountUsd = round2(req.currency === "USD" ? req.amount : req.amount / sosRate);
    if (amountUsd < Number(settings.min_amount_usd) || amountUsd > Number(settings.max_amount_usd)) {
      throw new PaymentError(
        `Amount must be between $${settings.min_amount_usd} and $${settings.max_amount_usd}`,
        "PROVIDER_ERROR",
      );
    }
    const platformFee = round2((amountUsd * Number(settings.platform_fee)) / 100);
    const creatorAmount = round2(amountUsd - platformFee);

    // 4. Provider & rate limiting.
    const provider = providerForPhone(req.phone);
    const ipHash = await sha256Hex(`${Deno.env.get("IP_HASH_SALT") ?? "itaager"}:${req.clientIp}`);
    await this.enforceRateLimits(req.phone, ipHash);

    // 5. Supporter record (upsert by phone).
    const { data: supporter } = await this.db
      .from("supporters")
      .upsert(
        { phone: req.phone, name: req.supporterName, email: req.supporterEmail },
        { onConflict: "phone" },
      )
      .select("id")
      .single();

    // 6. Pending transaction with a unique, unguessable reference.
    const reference = generateReference();
    const { data: tx, error: insertError } = await this.db
      .from("transactions")
      .insert({
        transaction_reference: reference,
        idempotency_key: req.idempotencyKey,
        creator_id: creator.id,
        supporter_id: supporter?.id ?? null,
        supporter_user_id: req.supporterUserId,
        supporter_name: req.supporterName,
        supporter_email: req.supporterEmail,
        supporter_phone: req.phone,
        amount: req.amount,
        currency: req.currency,
        amount_usd: amountUsd,
        platform_fee: platformFee,
        creator_amount: creatorAmount,
        payment_provider: provider.id,
        status: "pending",
        message: req.message,
        is_anonymous: req.isAnonymous,
        client_ip_hash: ipHash,
      })
      .select("id")
      .single();

    if (insertError) {
      // Unique violation on idempotency_key = a concurrent duplicate request.
      if (insertError.code === "23505") {
        const again = await this.db
          .from("transactions")
          .select("transaction_reference, status")
          .eq("idempotency_key", req.idempotencyKey)
          .single();
        return { reference: again.data!.transaction_reference, status: again.data!.status, duplicate: true };
      }
      throw new PaymentError("Could not create transaction", "PROVIDER_ERROR", 500);
    }

    // 7. Ask the provider to push the payment prompt to the supporter's phone.
    const requestLog = {
      reference,
      amount: req.amount,
      currency: req.currency,
      phone: maskPhone(req.phone),
      mode: provider.mode,
    };
    try {
      const result = await provider.createPayment({
        reference,
        amount: req.amount,
        currency: req.currency,
        phone: req.phone,
        description: `Support for ${creator.display_name} on Itaager`,
      });
      await this.log(tx.id, provider.id, "create", requestLog, result.raw, result.status);
      await this.applyStatus(reference, result.status, result.providerTransactionId);
      return {
        reference,
        status: result.status === "processing" ? "processing" : result.status,
        customerMessage: result.customerMessage,
        duplicate: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown provider error";
      await this.log(tx.id, provider.id, "create", requestLog, null, "error", message);
      await this.applyStatus(reference, "failed", null);
      throw err instanceof PaymentError ? err : new PaymentError("Payment provider error", "PROVIDER_ERROR", 502);
    }
  }

  // ---------------------------------------------------------------------------
  /** Returns the current status, asking the provider if still open. */
  async checkPaymentStatus(reference: string) {
    const tx = await this.getTx(reference);
    if (TERMINAL.has(tx.status)) return tx.status;
    return await this.verifyPayment(tx);
  }

  /** Source of truth: queries the provider and persists the verified status. */
  async verifyPayment(tx: TxRow): Promise<string> {
    const provider = getProvider(tx.payment_provider as ProviderId);

    if (Date.now() - new Date(tx.created_at).getTime() > PAYMENT_TIMEOUT_MS) {
      await this.log(tx.id, provider.id, "timeout", null, null, "failed", "Payment timed out");
      return await this.applyStatus(tx.transaction_reference, "failed", tx.provider_transaction_id);
    }

    const result = await provider.checkPaymentStatus({
      reference: tx.transaction_reference,
      providerTransactionId: tx.provider_transaction_id,
      createdAt: tx.created_at,
    });
    if (result.status !== "processing") {
      await this.log(tx.id, provider.id, "verify", { reference: tx.transaction_reference }, result.raw, result.status);
    }
    return await this.applyStatus(tx.transaction_reference, result.status, result.providerTransactionId);
  }

  // ---------------------------------------------------------------------------
  /** Authenticated callback -> re-verify with provider -> persist. */
  async handleCallback(providerId: ProviderId, req: Request) {
    const provider = getProvider(providerId);
    const rawBody = await req.text();
    const event = await provider.parseCallback(req, rawBody);
    const tx = await this.getTx(event.reference);

    await this.log(tx.id, provider.id, "callback", null, event.raw, event.claimedStatus);

    if (tx.payment_provider !== provider.id) {
      throw new PaymentError("Provider mismatch", "INVALID_CALLBACK", 400);
    }
    if (TERMINAL.has(tx.status)) return tx.status; // duplicate callback — no-op

    // Never trust the callback alone: confirm with the provider.
    return await this.verifyPayment({
      ...tx,
      provider_transaction_id: tx.provider_transaction_id ?? event.providerTransactionId,
    });
  }

  // ---------------------------------------------------------------------------
  async processRefund(reference: string, adminId: string) {
    const tx = await this.getTx(reference);
    if (tx.status !== "successful" || !tx.provider_transaction_id) {
      throw new PaymentError("Only successful payments can be refunded", "PROVIDER_ERROR", 409);
    }
    const provider = getProvider(tx.payment_provider as ProviderId);
    const result = await provider.processRefund({
      reference,
      providerTransactionId: tx.provider_transaction_id,
      amount: Number(tx.amount),
      currency: tx.currency,
    });
    await this.log(tx.id, provider.id, "refund", { reference, by: adminId }, result.raw, result.ok ? "refunded" : "error");
    if (!result.ok) throw new PaymentError("Refund was rejected by the provider", "PROVIDER_ERROR", 502);

    await this.applyStatus(reference, "refunded", tx.provider_transaction_id);
    await this.db.from("admin_activity_logs").insert({
      admin_id: adminId,
      action: "refund",
      entity_type: "transaction",
      entity_id: tx.id,
      description: `Refunded ${tx.amount} ${tx.currency} (${reference})`,
    });
    return "refunded";
  }

  // ---------------------------------------------------------------------------
  private async getTx(reference: string): Promise<TxRow> {
    const { data } = await this.db
      .from("transactions")
      .select("id, transaction_reference, status, payment_provider, provider_transaction_id, created_at, amount, currency")
      .eq("transaction_reference", reference)
      .maybeSingle();
    if (!data) throw new PaymentError("Transaction not found", "PROVIDER_ERROR", 404);
    return data as TxRow;
  }

  private async applyStatus(reference: string, status: ProviderStatus | "failed", providerTxId: string | null) {
    const { data, error } = await this.db.rpc("finalize_transaction", {
      p_reference: reference,
      p_status: status,
      p_provider_transaction_id: providerTxId,
    });
    if (error) throw new PaymentError("Could not update transaction", "PROVIDER_ERROR", 500);
    return (data as { status: string }).status;
  }

  private async enforceRateLimits(phone: string, ipHash: string) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const [byIp, byPhone, open] = await Promise.all([
      this.db.from("transactions").select("id", { count: "exact", head: true })
        .eq("client_ip_hash", ipHash).gte("created_at", since),
      this.db.from("transactions").select("id", { count: "exact", head: true })
        .eq("supporter_phone", phone).gte("created_at", since),
      this.db.from("transactions").select("id", { count: "exact", head: true })
        .eq("supporter_phone", phone).in("status", ["pending", "processing"]).gte("created_at", since),
    ]);
    if ((byIp.count ?? 0) >= RATE_LIMITS.perIpPer10Min || (byPhone.count ?? 0) >= RATE_LIMITS.perPhonePer10Min) {
      throw new PaymentError("Too many payment attempts. Please wait a few minutes.", "PROVIDER_ERROR", 429);
    }
    if ((open.count ?? 0) >= RATE_LIMITS.openPerPhone) {
      throw new PaymentError(
        "You already have a payment waiting for approval on this number. Complete or cancel it first.",
        "PROVIDER_ERROR",
        429,
      );
    }
  }

  private async log(
    transactionId: string,
    provider: string,
    event: string,
    requestData: unknown,
    responseData: unknown,
    status: string,
    errorMessage?: string,
  ) {
    await this.db.from("payment_logs").insert({
      transaction_id: transactionId,
      provider,
      event,
      request_data: requestData ?? null,
      response_data: responseData ?? null,
      status,
      error_message: errorMessage ?? null,
    });
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function maskPhone(phone: string) {
  return phone.slice(0, 5) + "****" + phone.slice(-2);
}
