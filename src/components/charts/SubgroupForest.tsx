"use client";

/**
 * SubgroupForest — recall with bootstrap CIs per subgroup level
 * (OOF at S2). Insufficient rows (n < 30) fade to 40% with a chip.
 * Analysis of model behaviour — not a basis for decisions about
 * individuals.
 */

import type { SubgroupGroup } from "@/lib/client/api";
import { fmtP, fmtPct } from "@/lib/format";

const W = 560;
const LABEL_W = 104;
const N_W = 108;
const ROW_H = 30;

function FeatureBlock({ group }: { group: SubgroupGroup }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {group.feature}
      </p>
      <svg
        viewBox={`0 0 ${W} ${group.levels.length * ROW_H}`}
        className="mt-1 w-full"
        role="img"
        aria-label={`${group.feature} recall by level`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const x = LABEL_W + v * (W - LABEL_W - N_W);
          return (
            <line
              key={v}
              x1={x}
              y1={2}
              x2={x}
              y2={group.levels.length * ROW_H - 2}
              stroke="rgba(243,239,230,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {group.levels.map((lvl, i) => {
          const y = i * ROW_H + ROW_H / 2;
          const xFor = (v: number) => LABEL_W + v * (W - LABEL_W - N_W);
          const x0 = xFor(Math.max(0, lvl.ciRecall[0]));
          const x1 = xFor(Math.min(1, lvl.ciRecall[1]));
          const xm = xFor(lvl.recall);
          return (
            <g key={lvl.level} opacity={lvl.insufficient ? 0.4 : 1}>
              <text x={0} y={y + 3.5} fontSize={11.5} fill="var(--text-2)">
                {lvl.level}
              </text>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke="var(--gold-500)" strokeWidth={1.5} />
              <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke="var(--gold-500)" strokeWidth={1.5} />
              <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="var(--gold-500)" strokeWidth={1.5} />
              <circle cx={xm} cy={y} r={3.5} fill="var(--gold-500)" />
              <text
                x={W}
                y={y + 3.5}
                fontSize={10.5}
                fill="var(--text-3)"
                textAnchor="end"
                fontFamily="var(--font-geist-mono)"
              >
                {fmtPct(lvl.recall)} · n = {lvl.n}
                {lvl.insufficient ? " · insufficient sample" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SubgroupForest({
  groups,
  overall,
}: {
  groups: SubgroupGroup[];
  overall?: { recall: number; precision: number; n: number };
}) {
  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-3">No subgroup data.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <FeatureBlock key={g.feature} group={g} />
      ))}
      {overall ? (
        <p className="num text-[11px] text-ink-3">
          overall recall {fmtP(overall.recall)} · precision {fmtP(overall.precision)} · n ={" "}
          {overall.n}
        </p>
      ) : null}
    </div>
  );
}
