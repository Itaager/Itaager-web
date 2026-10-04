import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Avatar, Logo } from "@/components/ui/misc";
import { ExcludeFromAnalytics } from "@/components/site/analytics";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks, type NavItem } from "./nav-links";

interface ShellProps {
  nav: NavItem[];
  user: { name: string; subtitle: string; avatarUrl?: string | null };
  badge?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ nav, user, badge, footer, children }: ShellProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (desktop) / top bar (mobile) */}
      <aside className="sticky top-0 z-30 border-b border-line bg-surface-2 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-5">
            <Link href="/" aria-label="Itaager home" className="flex items-center gap-2">
              <Logo />
              {badge && <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bg">{badge}</span>}
            </Link>
            <div className="flex items-center gap-1">
            <ThemeToggle className="size-9" />
            <form action={signOut} className="lg:hidden">
              <button className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2" aria-label="Sign out">
                <LogOut className="size-4.5" />
              </button>
            </form>
            </div>
          </div>

          <NavLinks items={nav} />

          <div className="mt-auto hidden space-y-3 p-4 lg:block">
            {footer}
            <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-3">
              <Avatar src={user.avatarUrl} name={user.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink-3">{user.subtitle}</p>
              </div>
              <form action={signOut}>
                <button className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Sign out" title="Sign out">
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <ExcludeFromAnalytics />
      <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
