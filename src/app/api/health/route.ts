import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [datasets, experiments, predictions] = await Promise.all([
      db.dataset.findMany({ orderBy: { subject: "asc" } }),
      db.experimentRun.count(),
      db.prediction.count(),
    ]);
    const seededAt = datasets.length
      ? datasets.reduce<Date | null>(
          (min, d) => (min === null || d.createdAt < min ? d.createdAt : min),
          null
        )
      : null;
    return NextResponse.json({
      status: "ok",
      engine: "1.0.0",
      datasets: datasets.map((d) => ({
        subject: d.subject,
        name: d.name,
        nRows: d.nRows,
        nFeatures: d.nFeatures,
        nZeroG3: d.nZeroG3,
        sha256: d.sha256,
        license: d.license,
        version: d.version,
      })),
      counts: { experiments, predictions },
      seededAt,
    });
  } catch (err) {
    console.error("[api/health]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
