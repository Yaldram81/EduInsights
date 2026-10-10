import { cn } from "@/lib/utils";

/**
 * Wordmark — "EduInsight" in the display serif (weight 500), followed by
 * "AI" in small caps, champagne, letter-spaced +0.18em.
 */
export function Wordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap", className)}
    >
      <span
        className={cn(
          "font-display font-medium leading-none tracking-tight text-ink-1",
          compact ? "text-lg" : "text-xl",
        )}
      >
        EduInsight
      </span>
      <span className="text-[0.65rem] font-medium uppercase leading-none tracking-[0.18em] text-gold-400">
        AI
      </span>
    </span>
  );
}
