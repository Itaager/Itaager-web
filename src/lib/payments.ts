// Browser-side helpers that talk to the payment Edge Functions. They only send
// the supporter's input — no credentials and no status updates. The status
// always comes back from the server after it verifies with the provider.

import { createClient } from "@/lib/supabase/client";
import { functionsUrl, supabaseAnonKey } from "@/lib/supabase/env";
import type { Currency, TransactionStatus } from "@/lib/types";

export interface CreatePaymentBody {
  idempotencyKey: string;
  creatorUsername: string;
  amount: number;
  currency: Currency;
  supporterName: string;
  supporterEmail: string | null;
  phone: string;
  message: string | null;
  isAnonymous: boolean;
}

class PaymentRequestError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

async function authHeader() {
  const { data } = await createClient().auth.getSession();
  return `Bearer ${data.session?.access_token ?? supabaseAnonKey}`;
}

export async function createPayment(body: CreatePaymentBody): Promise<{ reference: string; status: TransactionStatus }> {
  let res: Response;
  try {
    res = await fetch(`${functionsUrl}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: supabaseAnonKey, Authorization: await authHeader() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PaymentRequestError("Network problem. Check your connection and try again.", true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PaymentRequestError(data.error ?? "Payment could not be started. Please try again.", res.status >= 500);
  }
  return data;
}

export async function fetchPaymentStatus(reference: string): Promise<TransactionStatus | null> {
  try {
    const res = await fetch(`${functionsUrl}/payment-status?reference=${encodeURIComponent(reference)}`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()).status as TransactionStatus;
  } catch {
    return null;
  }
}
