"use client";

import { Fragment, useRef } from "react";
import type { InfoSetMeta, LadderSet } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const KEYS: LadderSet[] = ["S0", "S1", "S2", "S3", "S4"];

/**
 * InformationLadder — the S0→S4 stepper. Rings fill with champagne as
 * information accumulates; the selected node glows (shadow-glow).
 * role="radiogroup" with arrow-key navigation. Below: the selected set's
 * description + tier chips. Mobile: horizontally scrollable.
 */
export function InformationLadder({
  value,
  onChange,
  infoSets,
  className,
}: {
  value: LadderSet;
  onChange: (key: LadderSet) => void;
  infoSets?: Record<string, InfoSetMeta> | null;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = KEYS.indexOf(value);
  const selected = infoSets?.[value];

  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(KEYS.length - 1, idx + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = KEYS.length - 1;
    if (next != null) {
      e.preventDefault();
      onChange(KEYS[next]);
      refs.current[next]?.focus();
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-x-auto pb-1">
        <div
          role="radiogroup"
          aria-label="Information set"
          onKeyDown={onKeyDown}
          className="flex min-w-[340px] items-center"
        >
          {KEYS.map((key, i) => {
            const filled = i <= idx;
            const isSel = key === value;
            return (
              <Fragment key={key}>
                {i > 0 ? <span aria-hidden className="h-px flex-1 bg-hairline" /> : null}
                <button
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  tabIndex={isSel ? 0 : -1}
                  onClick={() => onChange(key)}
                  className="group flex min-w-[3rem] flex-col items-center gap-1.5 rounded-md px-1 py-1.5"
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                      filled ? "border-gold-500 bg-gold-500/15" : "border-hairline-strong",
                      isSel && "shadow-glow",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full transition-all duration-200",
                        filled ? "bg-gold-500" : "bg-transparent",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "num text-xs",
                      isSel
                        ? "font-semibold text-gold-400"
                        : filled
                          ? "text-ink-2"
                          : "text-ink-4",
                    )}
                  >
                    {key}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
      <div aria-live="polite" className="mt-2 min-h-[3.25rem]">
        <p className="text-xs leading-relaxed text-ink-2">
          {selected
            ? selected.description
            : infoSets
              ? "Select an information set."
              : "Loading information sets…"}
        </p>
        {selected ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {selected.tiers.map((t) => (
              <span
                key={t}
                className="num rounded-xs border border-hairline bg-raised px-1.5 py-0.5 text-[10px] text-ink-3"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
