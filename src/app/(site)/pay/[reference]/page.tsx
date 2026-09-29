import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentStatusView } from "@/components/creator/payment-status-view";
import { createClient } from "@/lib/supabase/server";
import type { Currency, TransactionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Payment status", robots: { index: false } };

const REFERENCE = /^ITG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export default async function PaymentPage({ params }: PageProps<"/pay/[reference]">) {
  const { reference } = await params;
  if (!REFERENCE.test(reference)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_payment_status", { p_reference: reference }).maybeSingle<{
    transaction_reference: string;
    status: TransactionStatus;
    amount: number;
    currency: Currency;
    creator_username: string;
    creator_display_name: string;
    created_at: string;
  }>();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <PaymentStatusView
        reference={data.transaction_reference}
        initialStatus={data.status}
        amount={Number(data.amount)}
        currency={data.currency}
        creatorUsername={data.creator_username}
        creatorName={data.creator_display_name}
        createdAt={data.created_at}
      />
    </div>
  );
}
