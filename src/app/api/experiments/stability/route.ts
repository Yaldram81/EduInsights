import { NextRequest, NextResponse } from "next/server";
import { getStability } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por", "both"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

/** GET /api/experiments/stability?subject=math → explanation stability (logistic + forest). */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("subject") ?? "math";
    if (!(SUBJECTS as readonly string[]).includes(raw)) {
      return NextResponse.json({ error: "subject must be math, por or both" }, { status: 400 });
    }
    const subject = raw as SubjectParam;

    const result = await getStability(subject);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
