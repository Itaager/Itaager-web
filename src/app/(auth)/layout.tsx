import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface-2 px-4 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <Link href="/" className="relative mb-8" aria-label="Itaager home">
        <Logo />
      </Link>
      <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
