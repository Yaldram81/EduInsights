import { cn } from "@/lib/utils";

/**
 * SectionHeading — champagne eyebrow overline + display-serif title
 * (balance-wrapped) + optional description.
 */
export function SectionHeading({
  overline,
  title,
  description,
  className,
}: {
  overline?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {overline ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">
          {overline}
        </p>
      ) : null}
      <h2 className="mt-2 font-display text-2xl font-medium leading-tight text-balance text-ink-1 md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-2">
          {description}
        </p>
      ) : null}
    </div>
  );
}
