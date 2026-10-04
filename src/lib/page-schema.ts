import { z } from "zod";
import { sanitize } from "./validation";

const RESERVED = new Set([
  "admin", "dashboard", "account", "api", "auth", "creator", "explore", "login", "register",
  "forgot-password", "reset-password", "onboarding", "pay", "suspended", "setup-incomplete",
  "sitemap", "robots", "llms",
]);

export const pageSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().transform(sanitize).pipe(z.string().min(2, "Enter a title").max(120)),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, e.g. terms-and-conditions")
    .max(60)
    .refine((s) => !RESERVED.has(s), "This address is used by the app"),
  metaDescription: z.string().transform(sanitize).pipe(z.string().max(300)),
  // Markdown: stored as written; it is rendered without raw HTML.
  content: z.string().max(100_000),
  status: z.enum(["draft", "published"]),
  showInFooter: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});
export type PageInput = z.input<typeof pageSchema>;
