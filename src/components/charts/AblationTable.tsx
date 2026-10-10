"use client";

/**
 * AblationTable — PR-AUC when dropping each feature group from S2 vs the
 * full model, on identical folds. Δ cells tint champagne by |Δ|; drops
 * worse than −0.02 are ruby-signed. Full model row carries a gold dot.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AblationResponse } from "@/lib/client/api";
import { fmtCi, fmtMetric, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AblationTable({
  full,
  dropped,
}: {
  full: AblationResponse["full"];
  dropped: AblationResponse["dropped"];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-hairline hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Dropped group
            </TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-[0.14em] text-ink-3">
              PR-AUC mean
            </TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Δ vs full
            </TableHead>
            <TableHead className="w-[30%] text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="sr-only">Magnitude</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="border-hairline hover:bg-transparent">
            <TableCell className="font-medium text-ink-1">
              <span className="mr-2 inline-block size-2 rounded-full bg-gold-500 align-middle" aria-hidden />
              Full model (S2)
            </TableCell>
            <TableCell className="num text-right text-ink-1">
              {fmtMetric(full.mean)}
              <span className="ml-2 text-[11px] text-ink-3">{fmtCi(full.ci)}</span>
            </TableCell>
            <TableCell className="num text-right text-ink-3">reference</TableCell>
            <TableCell />
          </TableRow>
          {dropped.map((d) => {
            const worse = d.delta < -0.02;
            const alpha = Math.min(0.3, 0.08 + Math.abs(d.delta) * 2);
            return (
              <TableRow key={d.group} className="border-hairline hover:bg-transparent">
                <TableCell className="text-ink-2">without {d.group}</TableCell>
                <TableCell className="num text-right text-ink-1">{fmtMetric(d.mean)}</TableCell>
                <TableCell
                  className={cn("num text-right", worse ? "text-ruby" : "text-ink-2")}
                  style={{ backgroundColor: `rgba(212, 175, 106, ${worse ? alpha : alpha * 0.5})` }}
                >
                  {signed(d.delta)}
                </TableCell>
                <TableCell />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
