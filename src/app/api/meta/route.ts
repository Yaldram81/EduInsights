import { NextResponse } from "next/server";
import { FEATURE_META, INFO_SET_META } from "@/lib/ml/featureMeta";
import { MODEL_LABELS } from "@/lib/ml/runner";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

/** GET /api/meta → feature dictionary, info-set ladder and model registry. */
export async function GET() {
  try {
    return NextResponse.json({
      featureMeta: FEATURE_META,
      infoSets: INFO_SET_META,
      models: MODEL_LABELS,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
