"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icons are referenced by name so the nav config can be built in Server Components.
const icons = {
  overview: LayoutDashboard,
  page: Globe,
  payments: CreditCard,
  supporters: Users,
  earnings: Wallet,
  profile: UserCircle,
  settings: Settings,
  reports: BarChart3,
  logs: Activity,
  creators: FileText,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="overflow-x-auto px-2 pb-2 lg:overflow-visible lg:px-3 lg:pt-2">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                )}
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
