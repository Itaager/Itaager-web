import { NextResponse, type NextRequest } from "next/server";
import { applyTxFilters, parseTxFilters, type TxRow } from "@/lib/tx-filters";
import { createClient } from "@/lib/supabase/server";
import { csvEscape } from "@/lib/utils";

const MAX_ROWS = 10_000;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 });

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseTxFilters(sp);
  let query = applyTxFilters(
    supabase.from("transactions").select("*, creator:creator_profiles(username, display_name)"),
    filters,
    ["supporter_name", "transaction_reference", "supporter_phone", "supporter_email", "provider_transaction_id"],
  );
  if (sp.creator && /^[0-9a-f-]{36}$/i.test(sp.creator)) query = query.eq("creator_id", sp.creator);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(MAX_ROWS).returns<TxRow[]>();
  if (error) return new NextResponse("Export failed", { status: 500 });

  const header = [
    "reference", "created_at", "status", "creator_username", "supporter_name", "supporter_phone", "supporter_email",
    "amount", "currency", "amount_usd", "platform_fee", "creator_amount", "provider", "provider_transaction_id",
    "anonymous", "message",
  ];
  const lines = (data ?? []).map((t) =>
    [
      t.transaction_reference, t.created_at, t.status, t.creator?.username, t.supporter_name, t.supporter_phone, t.supporter_email,
      t.amount, t.currency, t.amount_usd, t.platform_fee, t.creator_amount, t.payment_provider, t.provider_transaction_id,
      t.is_anonymous, t.message,
    ].map(csvEscape).join(","),
  );

  await supabase.from("admin_activity_logs").insert({
    admin_id: auth.user.id,
    action: "export_transactions",
    entity_type: "transaction",
    description: `Exported ${lines.length} transactions`,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="itaager-transactions-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
