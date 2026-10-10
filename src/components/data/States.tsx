import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shimmer block — slow diagonal champagne shimmer skeleton. */
export function Shimmer({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xs bg-raised", className)}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/** SkeletonBlock — generic shimmer block with role="status". */
export function SkeletonBlock({
  className,
  style,
  label,
}: {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading"}
      className={className}
      style={style}
    >
      <Shimmer className="h-full w-full" />
    </div>
  );
}

/** KPI row skeleton matching the KpiCard grid. */
export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading key figures"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-hairline bg-card p-5">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="mt-4 h-8 w-20" />
          <Shimmer className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Chart skeleton matching chart card proportions. */
export function ChartSkeleton({
  height = 320,
  label = "Loading chart",
}: {
  height?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col gap-3 rounded-md border border-hairline bg-card p-5"
    >
      <Shimmer className="h-3 w-40" />
      <Shimmer className="w-full" style={{ height }} />
      <Shimmer className="h-3 w-56" />
    </div>
  );
}

/** Panel skeleton for generic cards. */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading panel" className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** ErrorState — ruby hairline card + retry. */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("rounded-md border border-ruby/40 bg-ruby/5 p-5", className)}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-ruby">
        <AlertTriangle className="size-4" aria-hidden />
        Something went wrong
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        {message ?? "The request failed. The study data may still be warming up."}
      </p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-hairline-strong"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/** EmptyState — constellation line-art, one sentence, one action. */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-hairline-strong px-6 py-12 text-center",
        className,
      )}
    >
      <svg
        width="120"
        height="56"
        viewBox="0 0 120 56"
        fill="none"
        aria-hidden
        className="text-gold-500 opacity-60"
      >
        <line x1="18" y1="40" x2="46" y2="18" stroke="currentColor" strokeWidth="1" />
        <line x1="46" y1="18" x2="78" y2="34" stroke="currentColor" strokeWidth="1" />
        <line x1="78" y1="34" x2="104" y2="14" stroke="currentColor" strokeWidth="1" />
        <circle cx="18" cy="40" r="2.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="46" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="78" cy="34" r="2.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="104" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
      <p className="font-display text-lg text-ink-1">{title}</p>
      {hint ? (
        <p className="max-w-[52ch] text-sm leading-relaxed text-ink-3">{hint}</p>
      ) : null}
      {action}
    </div>
  );
}
