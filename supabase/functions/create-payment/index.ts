// POST /functions/v1/create-payment
// Validates input, creates a pending transaction and asks the provider to
// push a payment prompt to the supporter's phone.

import { clientIp, json, preflight } from "../_shared/http.ts";
import { PaymentError } from "../_shared/payments/types.ts";
import { PaymentService } from "../_shared/payments/service.ts";
import { adminClient, getCaller } from "../_shared/supabase.ts";
import { createPaymentSchema, normalizeSomaliPhone } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return json(req, { error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, 422);
  }
  const input = parsed.data;

  const phone = normalizeSomaliPhone(input.phone);
  if (!phone) return json(req, { error: "Enter a valid Somali mobile number" }, 422);

  try {
    const caller = await getCaller(req);
    const result = await new PaymentService(adminClient()).createPayment({
      idempotencyKey: input.idempotencyKey,
      creatorUsername: input.creatorUsername,
      amount: input.amount,
      currency: input.currency,
      supporterName: input.supporterName,
      supporterEmail: input.supporterEmail ?? null,
      phone,
      message: input.message || null,
      isAnonymous: input.isAnonymous,
      supporterUserId: caller?.id ?? null,
      clientIp: clientIp(req),
    });
    return json(req, result, result.duplicate ? 200 : 201);
  } catch (err) {
    if (err instanceof PaymentError) return json(req, { error: err.message, code: err.code }, err.httpStatus);
    console.error("create-payment failed", err);
    return json(req, { error: "Something went wrong. Please try again." }, 500);
  }
});
