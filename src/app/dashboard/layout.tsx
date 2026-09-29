import type { Metadata } from "next";
import { Clock, ExternalLink, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav-links";
import { requireCreator } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Itaager" }, robots: { index: false } };

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
  { href: "/dashboard/page", label: "My Page", icon: "page" },
  { href: "/dashboard/payments", label: "Payments", icon: "payments" },
  { href: "/dashboard/supporters", label: "Supporters", icon: "supporters" },
  { href: "/dashboard/earnings", label: "Earnings", icon: "earnings" },
  { href: "/dashboard/profile", label: "Profile", icon: "profile" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();
  // Treat a missing column (approval migration not applied yet) as approved.
  const approval = creator.approval_status ?? "approved";
  return (
    <DashboardShell
      nav={nav}
      user={{ name: creator.display_name, subtitle: `@${creator.username}`, avatarUrl: creator.avatar_url }}
      footer={
        <a
          href={`/creator/${creator.username}`}
          target="_blank"
          className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-3"
        >
          View my public page <ExternalLink className="size-4" aria-hidden />
        </a>
      }
    >
      {approval !== "approved" && (
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            approval === "pending" ? "border-warn/30 bg-warn-soft text-warn" : "border-bad/30 bg-bad-soft text-bad"
          }`}
        >
          {approval === "pending" ? <Clock className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <div>
            <p className="font-medium">{approval === "pending" ? "Your page is waiting for review" : "Your page was not approved"}</p>
            <p className="mt-0.5 text-ink-2">
              {approval === "pending"
                ? "An admin will review it soon. Until then your page is hidden and can't receive payments."
                : `${creator.review_note ? `Reason: ${creator.review_note}. ` : ""}Update your profile and it will be sent for review again.`}
            </p>
          </div>
        </div>
      )}
      {children}
    </DashboardShell>
  );
}
