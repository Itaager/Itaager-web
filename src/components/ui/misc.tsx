import { CheckCircle2, Clock, Loader2, RotateCcw, XCircle, Ban, Coffee } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TransactionStatus } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statusMeta: Record<TransactionStatus, { label: string; icon: LucideIcon; className: string }> = {
  successful: { label: "Successful", icon: CheckCircle2, className: "bg-good-soft text-good" },
  pending: { label: "Pending", icon: Clock, className: "bg-warn-soft text-warn" },
  processing: { label: "Processing", icon: Loader2, className: "bg-brand-soft text-brand" },
  failed: { label: "Failed", icon: XCircle, className: "bg-bad-soft text-bad" },
  cancelled: { label: "Cancelled", icon: Ban, className: "bg-surface-2 text-ink-2" },
  refunded: { label: "Refunded", icon: RotateCcw, className: "bg-surface-2 text-ink-2" },
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "brand" }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    brand: "bg-brand-soft text-brand",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Avatar({ src, name, size = 40, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={style}
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-medium text-ink-2", className)}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink", className)}>
      <span className="inline-flex size-7 items-center justify-center rounded-md bg-accent text-accent-ink">
        <Coffee className="size-4" strokeWidth={2.2} aria-hidden />
      </span>
      Itaager
    </span>
  );
}

export function EmptyState({ icon: Icon = Coffee, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        <Icon className="size-4.5 text-ink-3" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </Card>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
