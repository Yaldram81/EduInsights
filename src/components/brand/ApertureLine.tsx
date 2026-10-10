/**
 * ApertureLine — the signature 1 px champagne gradient hairline
 * (transparent → champagne → transparent), drawing from the center outward.
 */
export function ApertureLine({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full origin-center animate-aperture ${className}`}
      style={{ background: "var(--grad-aperture)", opacity: 0.45 }}
    />
  );
}
