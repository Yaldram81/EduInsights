import { NextResponse } from "next/server";
import { getTransfer } from "@/lib/ml/engine";
import { errorResponse } from "@/lib/api/params";

export const dynamic = "force-dynamic";

/** GET /api/transfer → cross-subject generalization (math→por, por→math). */
export async function GET() {
  try {
    const results = getTransfer();
    return NextResponse.json({ transfers: results });
  } catch (err) {
    return errorResponse(err);
  }
}
