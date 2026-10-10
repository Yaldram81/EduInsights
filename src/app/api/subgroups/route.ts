import { NextRequest, NextResponse } from "next/server";
import { getSubgroups } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por", "both"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

const INFO_SETS = ["S0", "S1", "S2", "S3", "S4", "S2-noabs"] as const;
type InfoSetParam = (typeof INFO_SETS)[number];

/** GET /api/subgroups?subject=math&infoSet=S2 → OOF subgroup fairness report. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const subjectRaw = sp.get("subject") ?? "math";
    if (!(SUBJECTS as readonly string[]).includes(subjectRaw)) {
      return NextResponse.json({ error: "subject must be math, por or both" }, { status: 400 });
    }
    const subject = subjectRaw as SubjectParam;

    const infoSetRaw = sp.get("infoSet") ?? "S2";
    if (!(INFO_SETS as readonly string[]).includes(infoSetRaw)) {
      return NextResponse.json(
        { error: "infoSet must be one of S0, S1, S2, S3, S4, S2-noabs" },
        { status: 400 }
      );
    }
    const infoSet = infoSetRaw as InfoSetParam;

    const result = await getSubgroups(subject, infoSet);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
