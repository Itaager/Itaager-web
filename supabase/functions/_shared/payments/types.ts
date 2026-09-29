// Provider-agnostic payment contracts. Every Somali mobile-money provider
// (Hormuud EVC Plus, Telesom ZAAD, Somtel eDahab, ...) implements
// PaymentProvider; the rest of the platform only talks to PaymentService.

export type ProviderId = "hormuud" | "telesom" | "somtel";

export type ProviderStatus =
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

export type Currency = "USD" | "SOS";

export interface CreatePaymentInput {
  reference: string;
  amount: number;
  currency: Currency;
  /** MSISDN normalised to 252XXXXXXXXX */
  phone: string;
  description: string;
}

export interface CreatePaymentResult {
  status: ProviderStatus;
  providerTransactionId: string | null;
  /** Message safe to show the supporter (e.g. "Approve the prompt on your phone"). */
  customerMessage?: string;
  /** Raw provider payload for payment_logs (must not contain secrets). */
  raw: unknown;
}

export interface StatusQuery {
  reference: string;
  providerTransactionId: string | null;
  createdAt: string;
}

export interface StatusResult {
  status: ProviderStatus;
  providerTransactionId: string | null;
  raw: unknown;
}

export interface CallbackEvent {
  reference: string;
  providerTransactionId: string | null;
  /** Status CLAIMED by the callback. Always re-verified with verifyPayment. */
  claimedStatus: ProviderStatus;
  raw: unknown;
}

export interface RefundInput {
  reference: string;
  providerTransactionId: string;
  amount: number;
  currency: Currency;
}

export interface RefundResult {
  ok: boolean;
  raw: unknown;
}

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly mode: "sandbox" | "live";
  /** Phone prefixes (after 252) this provider can charge. */
  supportsPhone(msisdn: string): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  checkPaymentStatus(query: StatusQuery): Promise<StatusResult>;
  /** Authenticates and parses a provider callback. Throws if invalid. */
  parseCallback(req: Request, rawBody: string): Promise<CallbackEvent>;
  processRefund(input: RefundInput): Promise<RefundResult>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "PROVIDER_NOT_CONFIGURED"
      | "UNSUPPORTED_PHONE"
      | "PROVIDER_ERROR"
      | "INVALID_CALLBACK",
    public readonly httpStatus = 400,
  ) {
    super(message);
  }
}
