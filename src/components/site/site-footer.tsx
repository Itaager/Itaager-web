import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { getFooterPages } from "@/lib/pages";

export async function SiteFooter() {
  const pages = await getFooterPages();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3">
            Itaager helps Somali creators get supported by their audience with EVC Plus mobile money.
          </p>
        </div>
        <nav aria-label="Platform">
          <p className="text-sm font-semibold text-ink">Platform</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-3">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li><Link href="/explore" className="hover:text-ink">Creators</Link></li>
            <li><Link href="/register" className="hover:text-ink">Start your page</Link></li>
          </ul>
        </nav>
        {pages.length > 0 && (
          <nav aria-label="Company">
            <p className="text-sm font-semibold text-ink">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-3">
              {pages.map((p) => (
                <li key={p.slug}><Link href={`/${p.slug}`} className="hover:text-ink">{p.title}</Link></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-3 sm:px-6">© {new Date().getFullYear()} Itaager. All rights reserved.</p>
      </div>
    </footer>
  );
}
