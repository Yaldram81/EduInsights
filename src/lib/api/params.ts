/**
 * Route-handler helpers: strict parameter parsing + uniform error mapping
 * (plan §13.5). ApiError carries an HTTP status and optional validation
 * issues; anything else maps to 500.
 */

import { NextResponse } from "next/server";
import { ApiError } from "../ml/engine";

export type SubjectParam = "math" | "por" | "both";

/**
 * Parse a subject query parameter.
 * Returns null when the value is present but invalid (→ 400).
 */
export function parseSubject(
  value: string | null,
  opts: { allowBoth?: boolean; fallback?: SubjectParam } = {}
): SubjectParam | null {
  const { allowBoth = true, fallback = "math" } = opts;
  if (value === null || value === "") return fallback;
  if (value === "math" || value === "por") return value;
  if (allowBoth && value === "both") return "both";
  return null;
}

/** Map any thrown error to a JSON response with the right status. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.issues) body.issues = err.issues;
    return NextResponse.json(body, { status: err.status });
  }
  console.error("[api] unhandled error:", err instanceof Error ? err.message : err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
