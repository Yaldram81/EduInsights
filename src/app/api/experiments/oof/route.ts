import { NextRequest, NextResponse } from "next/server";
import { getOof } from "@/lib/ml/engine";
import { MODEL_LABELS, type ModelKey, type Task } from "@/lib/ml/runner";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

const SUBJECTS = ["math", "por"] as const;
type SubjectParam = (typeof SUBJECTS)[number];

const TASKS = ["classification", "regression"] as const;
type TaskParam = (typeof TASKS)[number];

const INFO_SETS = ["S0", "S1", "S2", "S3", "S4", "S2-noabs"] as const;
type InfoSetParam = (typeof INFO_SETS)[number];

/** GET /api/experiments/oof?subject&task&infoSet&model → aligned OOF {y, pred}. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const subjectRaw = sp.get("subject") ?? "math";
    if (!(SUBJECTS as readonly string[]).includes(subjectRaw)) {
      return NextResponse.json({ error: "subject must be math or por" }, { status: 400 });
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

    const infoSetRaw = sp.get("infoSet") ?? "S2";
    if (!(INFO_SETS as readonly string[]).includes(infoSetRaw)) {
      return NextResponse.json(
        { error: "infoSet must be one of S0, S1, S2, S3, S4, S2-noabs" },
        { status: 400 }
      );
    }
    const infoSet = infoSetRaw as InfoSetParam;

    const modelRaw = sp.get("model") ?? "logistic";
    if (!(modelRaw in MODEL_LABELS)) {
      return NextResponse.json({ error: `unknown model "${modelRaw}"` }, { status: 400 });
    }
    const model = modelRaw as ModelKey;

    const oof = await getOof(subject, task as Task, infoSet, model);
    return NextResponse.json(oof);
  } catch (err) {
    return errorResponse(err);
  }
}
