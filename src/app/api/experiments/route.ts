import { NextRequest, NextResponse } from "next/server";
import { ensureMatrix, getExperiments, startMatrix } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por", "both"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

const TASKS = ["classification", "regression"] as const;
type TaskParam = (typeof TASKS)[number];

// Warm the experiment matrix in the background as soon as the module loads.
startMatrix();

/** GET /api/experiments?subject=math&task=classification → aggregate per infoSet × model. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const subjectRaw = sp.get("subject") ?? "math";
    if (!(SUBJECTS as readonly string[]).includes(subjectRaw)) {
      return NextResponse.json({ error: "subject must be math, por or both" }, { status: 400 });
    }
    const subject = subjectRaw as SubjectParam;

    const taskRaw = sp.get("task") ?? "classification";
    if (!(TASKS as readonly string[]).includes(taskRaw)) {
      return NextResponse.json(
        { error: "task must be classification or regression" },
        { status: 400 }
      );
    }
    const task = taskRaw as TaskParam;

    await ensureMatrix();
    const result = await getExperiments(subject, task);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
