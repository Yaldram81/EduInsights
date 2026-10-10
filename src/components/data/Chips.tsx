import { BadgeCheck } from "lucide-react";
import type { Subject } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[11px] font-medium";

/** PreregisteredChip — champagne outline with badge-check. */
export function PreregisteredChip({ className }: { className?: string }) {
  return (
    <span className={cn(base, "border-gold-700 text-gold-400", className)}>
      <BadgeCheck className="size-3" aria-hidden />
      Preregistered
    </span>
  );
}

/** ExploratoryChip — dashed outline, quiet. */
export function ExploratoryChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(base, "border-dashed border-hairline-strong text-ink-3", className)}
    >
      Exploratory
    </span>
  );
}

/** BaselineChip — platinum marker for baseline series. */
export function BaselineChip({ className }: { className?: string }) {
  return (
    <span className={cn(base, "border-hairline text-ink-3", className)}>
      <span aria-hidden>○</span>
      Baseline
    </span>
  );
}

/** DatasetChip — neutral dataset context chip. */
export function DatasetChip({
  subject,
  className,
}: {
  subject?: Subject | "both" | null;
  className?: string;
}) {
  const label =
    subject === "math"
      ? "UCI Student Performance · Mathematics"
      : subject === "por"
        ? "UCI Student Performance · Portuguese"
        : subject === "both"
          ? "UCI Student Performance · both subjects"
          : "UCI Student Performance";
  return (
    <span className={cn(base, "border-hairline bg-raised text-ink-2", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-gold-500" />
      {label}
    </span>
  );
}
