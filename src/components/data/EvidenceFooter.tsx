import { cn } from "@/lib/utils";

/**
 * EvidenceFooter — provenance caption required on every chart and table
 * card: n · CV design · metric · dataset · extra. Mono, dot-separated.
 */
export function EvidenceFooter({
  n,
  design,
  metric,
  dataset,
  extra,
  items,
  link,
  className,
}: {
  n?: string | number;
  design?: string;
  metric?: string;
  dataset?: string;
  extra?: string;
  /** Positional escape hatch — rendered after the named slots. */
  items?: (string | null | undefined)[];
  link?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  const parts = [
    n != null ? `n = ${typeof n === "number" ? n.toLocaleString("en") : n}` : null,
    design,
    metric,
    dataset,
    extra,
    ...(items ?? []),
  ].filter((x): x is string => Boolean(x));

  if (parts.length === 0 && !link) return null;

  return (
    <p
      className={cn(
        "num mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-ink-3",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <span aria-hidden className="text-ink-4">
              ·
            </span>
          ) : null}
          <span>{part}</span>
        </span>
      ))}
      {link ? (
        link.href ? (
          <a
            href={link.href}
            className="ml-auto shrink-0 underline decoration-dotted underline-offset-2 transition-colors hover:text-gold-400"
          >
            {link.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={link.onClick}
            className="ml-auto shrink-0 underline decoration-dotted underline-offset-2 transition-colors hover:text-gold-400"
          >
            {link.label}
          </button>
        )
      ) : null}
    </p>
  );
}
