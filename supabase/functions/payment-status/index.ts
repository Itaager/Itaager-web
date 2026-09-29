// GET /functions/v1/payment-status?reference=ITG-XXXX-XXXX-XXXX-XXXX
// Polled by the supporter's waiting screen. Status comes from the provider
// (server-side verification), never from the client.

import { json, preflight } from "../_shared/http.ts";
import { PaymentError } from "../_shared/payments/types.ts";
import { PaymentService } from "../_shared/payments/service.ts";
import { adminClient } from "../_shared/supabase.ts";

const REFERENCE = /^ITG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "GET") return json(req, { error: "Method not allowed" }, 405);

  const reference = new URL(req.url).searchParams.get("reference") ?? "";
  if (!REFERENCE.test(reference)) return json(req, { error: "Invalid reference" }, 400);

  try {
    const status = await new PaymentService(adminClient()).checkPaymentStatus(reference);
    return json(req, { reference, status });
  } catch (err) {
    if (err instanceof PaymentError) return json(req, { error: err.message }, err.httpStatus);
    console.error("payment-status failed", err);
    return json(req, { error: "Could not check payment status" }, 500);
  }
});
