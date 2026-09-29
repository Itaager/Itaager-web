import { z } from "zod";
import { normalizeSomaliPhone } from "./utils";

/** Strip HTML tags and control characters from user text. */
export function sanitize(s: string) {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const cleanText = (max: number, label: string) =>
  z.string().transform(sanitize).pipe(z.string().max(max, `${label} must be at most ${max} characters`));

const optionalUrl = z
  .string()
  .nullish()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .pipe(z.url({ protocol: /^https?$/, message: "Enter a full URL starting with https://" }).max(300).nullable());

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "3–30 characters: lowercase letters, numbers and underscores");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "At most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const somaliPhoneSchema = z
  .string()
  .trim()
  .refine((v) => normalizeSomaliPhone(v) !== null, "Enter a valid Somali mobile number, e.g. 61 234 5678");

export const registerSchema = z.object({
  fullName: cleanText(80, "Name").pipe(z.string().min(2, "Enter your full name")),
  username: usernameSchema,
  email: z.email("Enter a valid email").max(120),
  password: passwordSchema,
  accountType: z.enum(["creator", "supporter"]),
});
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email") });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const CATEGORIES = [
  "Developer",
  "Designer",
  "Writer",
  "Artist",
  "Musician",
  "Poet",
  "Educator",
  "Student",
  "Podcaster",
  "Video creator",
  "Photographer",
  "Community",
  "Other",
] as const;

export const creatorProfileSchema = z.object({
  displayName: cleanText(80, "Name").pipe(z.string().min(2, "Enter a display name")),
  bio: cleanText(500, "Bio"),
  category: z.enum(CATEGORIES),
  phone: somaliPhoneSchema.or(z.literal("")),
  location: cleanText(80, "Location"),
  avatarUrl: z.string().trim().max(500).optional(),
  website: optionalUrl,
  twitter: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
});
export type CreatorProfileInput = z.input<typeof creatorProfileSchema>;
export type CreatorProfileOutput = z.output<typeof creatorProfileSchema>;

export const PRESET_AMOUNTS_USD = [1, 3, 5, 10] as const;

export const supportSchema = z
  .object({
    amount: z.number({ message: "Choose an amount" }).positive("Choose an amount"),
    currency: z.enum(["USD", "SOS"]),
    supporterName: cleanText(80, "Name"),
    supporterEmail: z.union([z.literal(""), z.email("Enter a valid email").max(120)]),
    phone: somaliPhoneSchema,
    message: cleanText(500, "Message"),
    isAnonymous: z.boolean(),
  })
  .refine((d) => d.isAnonymous || d.supporterName.length > 0, {
    message: "Enter your name or support anonymously",
    path: ["supporterName"],
  });
export type SupportInput = z.input<typeof supportSchema>;
export type SupportOutput = z.output<typeof supportSchema>;

export const platformSettingsSchema = z.object({
  platformName: cleanText(60, "Platform name").pipe(z.string().min(2)),
  supportEmail: z.email(),
  defaultCurrency: z.enum(["USD", "SOS"]),
  platformFee: z.coerce.number().min(0).max(50),
  sosPerUsd: z.coerce.number().positive(),
  minAmountUsd: z.coerce.number().positive(),
  maxAmountUsd: z.coerce.number().positive(),
  paymentsEnabled: z.boolean(),
});
