// POST /functions/v1/admin-refund  { "reference": "ITG-..." }
// Super admins only (JWT required + role check in the database).

import { json, preflight } from "../_shared/http.ts";
import { PaymentError } from "../_shared/payments/types.ts";
import { PaymentService } from "../_shared/payments/service.ts";
import { adminClient, getCaller } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "Unauthorized" }, 401);

  const db = adminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role, status")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (profile?.role !== "super_admin" || profile.status !== "active") {
    return json(req, { error: "Forbidden" }, 403);
  }

  let reference = "";
  try {
    reference = String((await req.json()).reference ?? "");
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }
  if (!/^ITG-[A-Z2-9-]{19}$/.test(reference)) return json(req, { error: "Invalid reference" }, 400);

  try {
    const status = await new PaymentService(db).processRefund(reference, caller.id);
    return json(req, { reference, status });
  } catch (err) {
    if (err instanceof PaymentError) return json(req, { error: err.message }, err.httpStatus);
    console.error("admin-refund failed", err);
    return json(req, { error: "Refund failed" }, 500);
  }
});
