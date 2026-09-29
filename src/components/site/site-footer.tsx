import Link from "next/link";
import { Logo } from "@/components/ui/misc";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="text-[15px]" />
          <span>© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex gap-5">
          <Link href="/" className="hover:text-ink">Home</Link>
          <Link href="/explore" className="hover:text-ink">Creators</Link>
          <Link href="/register" className="hover:text-ink">Start your page</Link>
        </nav>
      </div>
    </footer>
  );
}
