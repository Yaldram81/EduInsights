"use client";

/**
 * ForestPlot — mean dot + CI whisker per model at one information tier.
 * Baselines render hollow; a platinum dashed reference marks the best
 * baseline; significant rows (CI excludes the reference) get a champagne ●.
 * A visually-hidden table mirrors the numbers for screen readers.
 */

export interface ForestRow {
  model: string;
  label: string;
  mean: number;
  ci: readonly [number, number];
  isBaseline: boolean;
  significant: boolean;
}

const ROW_H = 36;
const PAD_T = 18;
const PAD_B = 26;
const LABEL_W = 148;
const VALUE_W = 64;
const SIGNIFICANT_W = 26;

export function ForestPlot({
  rows,
  reference,
  fmt = (v: number) => v.toFixed(2),
}: {
  rows: ForestRow[];
  reference?: number | null;
  fmt?: (v: number) => string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-3">No rows to display.</p>;
  }

  const lo = Math.min(
    ...rows.map((r) => Math.min(r.ci[0], r.mean)),
    reference ?? Infinity,
  );
  const hi = Math.max(
    ...rows.map((r) => Math.max(r.ci[1], r.mean)),
    reference ?? -Infinity,
  );
  const span = hi - lo || 1;
  const plotLo = lo - span * 0.08;
  const plotHi = hi + span * 0.08;
  const xFor = (v: number) =>
    LABEL_W + ((v - plotLo) / (plotHi - plotLo)) * (720 - LABEL_W - VALUE_W - SIGNIFICANT_W);

  const height = PAD_T + rows.length * ROW_H + PAD_B;

  return (
    <div>
      <svg
        viewBox={`0 0 720 ${height}`}
        className="w-full"
        role="img"
        aria-label={`Forest plot: ${rows.map((r) => `${r.label} ${fmt(r.mean)}`).join(", ")}`}
      >
        {reference != null && Number.isFinite(reference) ? (
          <g>
            <line
              x1={xFor(reference)}
              y1={PAD_T - 6}
              x2={xFor(reference)}
              y2={height - PAD_B + 6}
              stroke="var(--text-4)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={xFor(reference)}
              y={height - 8}
              fontSize={10}
              fill="var(--text-4)"
              textAnchor="middle"
              fontFamily="var(--font-geist-mono)"
            >
              best baseline {fmt(reference)}
            </text>
          </g>
        ) : null}

        {rows.map((row, i) => {
          const y = PAD_T + i * ROW_H + ROW_H / 2;
          const x0 = xFor(row.ci[0]);
          const x1 = xFor(row.ci[1]);
          const xm = xFor(row.mean);
          const color = row.isBaseline ? "var(--text-3)" : "var(--gold-500)";
          return (
            <g key={row.model}>
              <text
                x={0}
                y={y + 3.5}
                fontSize={12}
                fill={row.isBaseline ? "var(--text-3)" : "var(--text-1)"}
              >
                {row.label}
              </text>
              <line
                x1={x0}
                y1={y}
                x2={x1}
                y2={y}
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <line x1={x0} y1={y - 5} x2={x0} y2={y + 5} stroke={color} strokeWidth={1.5} />
              <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke={color} strokeWidth={1.5} />
              {row.isBaseline ? (
                <circle cx={xm} cy={y} r={4} fill="var(--bg-2)" stroke={color} strokeWidth={1.5} />
              ) : (
                <circle cx={xm} cy={y} r={4} fill={color} />
              )}
              <text
                x={720}
                y={y + 3.5}
                fontSize={11}
                fill="var(--text-2)"
                textAnchor="end"
                fontFamily="var(--font-geist-mono)"
              >
                {fmt(row.mean)}
              </text>
              {row.significant ? (
                <circle
                  cx={720 - VALUE_W + 8}
                  cy={y}
                  r={3}
                  fill="var(--gold-500)"
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* screen-reader table mirroring the plot */}
      <table className="sr-only">
        <caption>Model comparison at the selected information tier</caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Mean</th>
            <th scope="col">95% CI</th>
            <th scope="col">Baseline</th>
            <th scope="col">Beats best baseline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model}>
              <td>{r.label}</td>
              <td>{fmt(r.mean)}</td>
              <td>{`[${fmt(r.ci[0])}, ${fmt(r.ci[1])}]`}</td>
              <td>{r.isBaseline ? "yes" : "no"}</td>
              <td>{r.significant ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
