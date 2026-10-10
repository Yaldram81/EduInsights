import { NextRequest, NextResponse } from "next/server";
import { explainPrediction } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

/** POST /api/explain {predictionId} → stored contributions (recomputed if missing). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { predictionId?: unknown } | null;
    if (!body || typeof body.predictionId !== "string" || body.predictionId.length === 0) {
      return NextResponse.json({ error: "predictionId is required" }, { status: 400 });
    }
    const result = await explainPrediction(body.predictionId);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
