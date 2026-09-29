import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLink } from "./nav-link";

/** Floating, rounded navbar. Fixed and transparent around the pill, so the page shows behind it. */
export async function SiteHeader() {
  const session = await getSession();
  const home =
    session?.profile.role === "super_admin" ? "/admin" : session?.profile.role === "creator" ? "/dashboard" : "/account";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="pointer-events-auto mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-full border border-line/70 bg-surface/85 pl-6 pr-2.5 shadow-[0_8px_30px_-12px_rgb(var(--shadow-tint)/0.14)] backdrop-blur-md">
        <Link href="/" aria-label="Itaager home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 text-[15px] sm:flex">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/explore">Creators</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ThemeToggle />
          {session ? (
            <LinkButton href={home} variant="accent" size="md" className="h-11 rounded-full px-6 text-[15px] font-semibold">
              Dashboard
            </LinkButton>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2 sm:inline-block">
                Sign in
              </Link>
              <LinkButton href="/register" variant="accent" size="md" className="h-11 rounded-full px-6 text-[15px] font-semibold">
                Get Started
              </LinkButton>
            </>
          )}
        </div>
      </div>

      {/* Links on small screens */}
      <nav className="pointer-events-auto mx-auto mt-2 flex w-fit justify-center gap-1 rounded-full border border-line/70 bg-surface/85 p-1 text-sm backdrop-blur-md sm:hidden">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/explore">Creators</NavLink>
        {!session && <NavLink href="/login">Sign in</NavLink>}
      </nav>
    </header>
  );
}
