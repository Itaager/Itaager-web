import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav-links";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Itaager Admin" }, robots: { index: false } };

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "overview", exact: true },
  { href: "/admin/creators", label: "Creators", icon: "creators" },
  { href: "/admin/transactions", label: "Payments", icon: "payments" },
  { href: "/admin/analytics", label: "Analytics", icon: "reports" },
  { href: "/admin/pages", label: "Pages", icon: "pages" },
];

const more = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/logs", label: "Activity" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <DashboardShell
      nav={nav}
      badge="Admin"
      user={{ name: profile.full_name, subtitle: profile.email, avatarUrl: profile.avatar_url }}
      footer={
        <nav aria-label="More" className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-ink-3">
          {more.map((m) => (
            <Link key={m.href} href={m.href} className="hover:text-ink">{m.label}</Link>
          ))}
        </nav>
      }
    >
      {children}
    </DashboardShell>
  );
}
