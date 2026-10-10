/**
 * EduInsight AI — number formatting.
 * Probabilities: 2 dp · percentages for shares only · true minus (U+2212).
 * Every number that reaches the UI goes through one of these helpers.
 */

/** Probability / metric in fixed decimals (default 2). */
export function fmtP(v: number | null | undefined, d = 2): string {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);
}

/** Share (0..1) → "32.9%". */
export function fmtPct(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)}%`;
}

/** Confidence interval → "[0.52, 0.61]". */
export function fmtCi(ci: readonly [number, number] | readonly number[]): string {
  if (!ci || ci.length < 2) return "[—, —]";
  return `[${fmtP(ci[0])}, ${fmtP(ci[1])}]`;
}

/** Adaptive metric formatting (MAE 1.36 · PR-AUC 0.55 · counts). */
export function fmtMetric(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 1000)) return v.toExponential(2);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/** "p < 0.001" or "p = 0.032". */
export function fmtPValue(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}

const intFmt = new Intl.NumberFormat("en");

/** 1,185 */
export function fmtInt(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? "—" : intFmt.format(v);
}

/** "+0.061" / "−0.061" with the true minus sign (U+2212). Default 3 dp. */
export function signed(v: number | null | undefined, d = 3): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
}

/**
 * Feature display value in a row label: `fmtFeatureValue("Medu", 3)` →
 * "Medu = 3"; categorical raw values pass through unchanged.
 */
export function fmtFeatureValue(name: string, v: string | number): string {
  return `${name} = ${typeof v === "number" ? fmtMetric(v) : String(v)}`;
}
