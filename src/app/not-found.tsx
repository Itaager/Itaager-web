import { Coffee } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
        <Coffee className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-ink-2">This page doesn&apos;t exist, or the creator is no longer available.</p>
      <div className="mt-6 flex gap-2">
        <LinkButton href="/">Go home</LinkButton>
        <LinkButton href="/explore" variant="outline">Explore creators</LinkButton>
      </div>
    </div>
  );
}
