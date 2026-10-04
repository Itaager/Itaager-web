export type UserRole = "super_admin" | "creator" | "supporter";
export type AccountStatus = "active" | "suspended";
export type TransactionStatus = "pending" | "processing" | "successful" | "failed" | "cancelled" | "refunded";
export type Currency = "USD" | "SOS";
export type CreatorApproval = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  category: string;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  total_earnings: number;
  total_supporters: number;
  total_transactions: number;
  approval_status: CreatorApproval;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_reference: string;
  creator_id: string;
  supporter_id: string | null;
  supporter_name: string;
  supporter_email: string | null;
  supporter_phone: string;
  amount: number;
  currency: Currency;
  amount_usd: number;
  platform_fee: number;
  creator_amount: number;
  payment_provider: string;
  provider_transaction_id: string | null;
  status: TransactionStatus;
  message: string | null;
  is_anonymous: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: string;
  platform_name: string;
  logo_url: string | null;
  support_email: string;
  default_currency: Currency;
  platform_fee: number;
  sos_per_usd: number;
  min_amount_usd: number;
  max_amount_usd: number;
  payments_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicSupporter {
  id: string;
  supporter_name: string;
  amount: number;
  currency: Currency;
  message: string | null;
  created_at: string;
}

export interface PaymentLog {
  id: string;
  transaction_id: string | null;
  provider: string;
  event: string;
  request_data: unknown;
  response_data: unknown;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

/** Shape returned by server actions used with useActionState. */
export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

export type PageStatus = "draft" | "published";

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  status: PageStatus;
  show_in_footer: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
}
