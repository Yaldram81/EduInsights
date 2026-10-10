import { fmtCi, fmtP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/client/api";

const LEVELS: Record<RiskLevel, { glyph: string; label: string; cls: string }> = {
  lower: {
    glyph: "▼",
    label: "Lower estimated risk",
    cls: "border-emerald/30 bg-emerald/10 text-emerald",
  },
  moderate: {
    glyph: "◆",
    label: "Moderate estimated risk",
    cls: "border-amber/30 bg-amber/10 text-amber",
  },
  higher: {
    glyph: "▲",
    label: "Higher estimated risk",
    cls: "border-ruby/30 bg-ruby/10 text-ruby",
  },
  uncertain: {
    glyph: "?",
    label: "Uncertain — interval spans threshold",
    cls: "border-hairline-strong bg-transparent text-ink-2",
  },
};

/**
 * RiskBadge — never color-only: glyph + words + the probability and its
 * conformal interval shown beside the badge. role="status".
 */
export function RiskBadge({
  level,
  probability,
  interval,
  className,
}: {
  level: RiskLevel;
  probability?: number | null;
  interval?: readonly [number, number] | null;
  className?: string;
}) {
  const l = LEVELS[level];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-medium",
          l.cls,
        )}
      >
        <span aria-hidden className="num">
          {l.glyph}
        </span>
        {l.label}
      </span>
      {probability != null ? (
        <span className="num text-sm text-ink-1">
          {fmtP(probability)}
          {interval ? <span className="ml-1.5 text-ink-3">{fmtCi(interval)}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
