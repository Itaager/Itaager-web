import { z } from "npm:zod@3.25.76";

/** Accepts 61xxxxxxx, 061xxxxxxx, 25261xxxxxxx, +252 61 xxx xxxx. Returns 252XXXXXXXXX. */
export function normalizeSomaliPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local = digits;
  if (local.startsWith("252")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  return /^[67]\d{8}$/.test(local) ? `252${local}` : null;
}

/** Strips HTML tags and control characters from user-provided text. */
export function sanitizeText(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const text = (max: number) => z.string().transform(sanitizeText).pipe(z.string().max(max));

export const createPaymentSchema = z.object({
  idempotencyKey: z.string().uuid(),
  creatorUsername: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),
  amount: z.number().positive().max(50_000_000),
  currency: z.enum(["USD", "SOS"]),
  supporterName: text(80).pipe(z.string().min(1, "Name is required")),
  supporterEmail: z.string().email().max(120).nullable().optional()
    .or(z.literal("").transform(() => null)),
  phone: z.string().max(20),
  message: text(500).nullable().optional(),
  isAnonymous: z.boolean().default(false),
});

export type CreatePaymentBody = z.infer<typeof createPaymentSchema>;
