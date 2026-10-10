import { cn } from "@/lib/utils";

/**
 * Monogram — a lens-like aperture: three horizontal hairlines inside a thin
 * champagne circle (observatory motif). 1.25 px stroke, 28 px default.
 */
export function Monogram({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="14" cy="14" r="12.6" stroke="var(--gold-500)" strokeWidth="1.25" />
      <line
        x1="7.75"
        y1="9.75"
        x2="20.25"
        y2="9.75"
        stroke="var(--gold-400)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <line
        x1="7.75"
        y1="14"
        x2="20.25"
        y2="14"
        stroke="var(--gold-400)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <line
        x1="7.75"
        y1="18.25"
        x2="20.25"
        y2="18.25"
        stroke="var(--gold-400)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
