// POST /functions/v1/payment-callback?provider=hormuud
// Webhook endpoint for payment providers. The provider authenticates the
// request (signature), then PaymentService re-verifies the status with the
// provider before persisting anything. Duplicate callbacks are no-ops.

import { PaymentError, type ProviderId } from "../_shared/payments/types.ts";
import { PaymentService } from "../_shared/payments/service.ts";
import { adminClient } from "../_shared/supabase.ts";

const PROVIDERS: ProviderId[] = ["hormuud", "telesom", "somtel"];

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const provider = new URL(req.url).searchParams.get("provider") as ProviderId | null;
  if (!provider || !PROVIDERS.includes(provider)) return reply({ error: "Unknown provider" }, 400);

  try {
    const status = await new PaymentService(adminClient()).handleCallback(provider, req);
    return reply({ received: true, status });
  } catch (err) {
    if (err instanceof PaymentError) return reply({ error: err.message }, err.httpStatus);
    console.error("payment-callback failed", err);
    return reply({ error: "Internal error" }, 500);
  }
});
