import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por", "both"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

/** GET /api/overview?subject=math → descriptive analytics for the Overview view. */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("subject") ?? "math";
    if (!(SUBJECTS as readonly string[]).includes(raw)) {
      return NextResponse.json({ error: "subject must be math, por or both" }, { status: 400 });
    }
    const subject = raw as SubjectParam;

    const overview = await getOverview(subject);
    return NextResponse.json(overview);
  } catch (err) {
    return errorResponse(err);
  }
}
