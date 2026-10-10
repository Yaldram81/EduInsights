import { NextRequest, NextResponse } from "next/server";
import { predictRisk } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por", "both"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

const INFO_SETS = ["S0", "S1", "S2", "S3", "S4", "S2-noabs"] as const;
type InfoSetParam = (typeof INFO_SETS)[number];

interface PredictBody {
  subject?: unknown;
  infoSet?: unknown;
  features?: unknown;
}

/** POST /api/predict {subject, infoSet, features} → calibrated risk + explanation. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as PredictBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be JSON: {subject, infoSet, features}" },
        { status: 400 }
      );
    }

    const subjectRaw = typeof body.subject === "string" ? body.subject : "math";
    if (!(SUBJECTS as readonly string[]).includes(subjectRaw)) {
      return NextResponse.json({ error: "subject must be math, por or both" }, { status: 400 });
    }
    const subject = subjectRaw as SubjectParam;

    const infoSetRaw = typeof body.infoSet === "string" ? body.infoSet : "S2";
    if (!(INFO_SETS as readonly string[]).includes(infoSetRaw)) {
      return NextResponse.json(
        { error: "infoSet must be one of S0, S1, S2, S3, S4, S2-noabs" },
        { status: 400 }
      );
    }
    const infoSet = infoSetRaw as InfoSetParam;

    if (typeof body.features !== "object" || body.features === null || Array.isArray(body.features)) {
      return NextResponse.json(
        { error: "features must be a JSON object of feature values" },
        { status: 400 }
      );
    }
    const features = body.features as Record<string, unknown>;

    // predictRisk maps validation problems to ApiError(400, issues) itself.
    const result = await predictRisk(subject, infoSet, features);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
