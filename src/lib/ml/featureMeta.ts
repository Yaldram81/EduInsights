/**
 * Feature metadata — single source of truth for the /predict form, request
 * validation (plan §13.3: strict ranges/levels from the data dictionary) and
 * human-readable labels.
 *
 * The raw dataset has 33 columns; G3 is the target, leaving 32 features
 * spread over the information tiers T0..T4 (see ./dataset).
 */

import { INFO_SETS, TIERS } from "./dataset";

export type FeatureType = "numeric" | "categorical";

export interface FeatureMeta {
  name: string;
  label: string;
  tier: "T0" | "T1" | "T2" | "T3" | "T4";
  group: string;
  type: FeatureType;
  levels?: string[];
  min?: number;
  max?: number;
  step?: number;
  description: string;
}

/** Ordered by tier (T0 → T4), matching the survey order in student.txt. */
export const FEATURE_META: FeatureMeta[] = [
  // ---------------- T0 — Background ----------------
  { name: "school", label: "School", tier: "T0", group: "Background", type: "categorical", levels: ["GP", "MS"], description: "Gabriel Pereira (GP) or Mousinho da Silveira (MS)" },
  { name: "sex", label: "Sex", tier: "T0", group: "Background", type: "categorical", levels: ["F", "M"], description: "Female (F) or male (M)" },
  { name: "age", label: "Age", tier: "T0", group: "Background", type: "numeric", min: 15, max: 22, step: 1, description: "Student age, 15–22 years" },
  { name: "address", label: "Home address", tier: "T0", group: "Background", type: "categorical", levels: ["U", "R"], description: "Urban (U) or rural (R)" },
  { name: "famsize", label: "Family size", tier: "T0", group: "Background", type: "categorical", levels: ["LE3", "GT3"], description: "≤3 (LE3) or >3 (GT3)" },
  { name: "Pstatus", label: "Parents' cohabitation", tier: "T0", group: "Background", type: "categorical", levels: ["T", "A"], description: "Living together (T) or apart (A)" },
  { name: "Medu", label: "Mother's education", tier: "T0", group: "Background", type: "numeric", min: 0, max: 4, step: 1, description: "0 none → 4 higher education" },
  { name: "Fedu", label: "Father's education", tier: "T0", group: "Background", type: "numeric", min: 0, max: 4, step: 1, description: "0 none → 4 higher education" },
  { name: "Mjob", label: "Mother's job", tier: "T0", group: "Background", type: "categorical", levels: ["at_home", "health", "other", "services", "teacher"], description: "Mother's occupation" },
  { name: "Fjob", label: "Father's job", tier: "T0", group: "Background", type: "categorical", levels: ["at_home", "health", "other", "services", "teacher"], description: "Father's occupation" },
  { name: "reason", label: "Reason to choose school", tier: "T0", group: "Background", type: "categorical", levels: ["home", "reputation", "course", "other"], description: "Close to home, school reputation, course preference or other" },
  { name: "guardian", label: "Guardian", tier: "T0", group: "Background", type: "categorical", levels: ["mother", "father", "other"], description: "Student's guardian" },
  { name: "traveltime", label: "Travel time to school", tier: "T0", group: "Background", type: "numeric", min: 1, max: 4, step: 1, description: "1 <15 min → 4 >1 h" },
  // ---------------- T1 — History & support ----------------
  { name: "failures", label: "Past class failures", tier: "T1", group: "History & support", type: "numeric", min: 0, max: 3, step: 1, description: "Number of past class failures (3 means ≥3)" },
  { name: "nursery", label: "Attended nursery school", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Nursery school attendance" },
  { name: "higher", label: "Wants higher education", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Intention to take higher education" },
  { name: "schoolsup", label: "Extra school support", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Extra educational support" },
  { name: "famsup", label: "Family educational support", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Family educational support" },
  { name: "paid", label: "Extra paid classes", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Extra paid classes within the course subject" },
  { name: "activities", label: "Extra-curricular activities", tier: "T1", group: "History & support", type: "categorical", levels: ["no", "yes"], description: "Extra-curricular activities" },
  // ---------------- T2 — Behavior & attendance ----------------
  { name: "studytime", label: "Weekly study time", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 4, step: 1, description: "1 <2 h → 4 >10 h" },
  { name: "freetime", label: "Free time after school", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "1 very low → 5 very high" },
  { name: "goout", label: "Going out with friends", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "1 very low → 5 very high" },
  { name: "Dalc", label: "Workday alcohol", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "Workday alcohol consumption, 1 very low → 5 very high" },
  { name: "Walc", label: "Weekend alcohol", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "Weekend alcohol consumption, 1 very low → 5 very high" },
  { name: "health", label: "Current health status", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "1 very bad → 5 very good" },
  { name: "romantic", label: "Romantic relationship", tier: "T2", group: "Behavior & attendance", type: "categorical", levels: ["no", "yes"], description: "In a romantic relationship" },
  { name: "internet", label: "Internet at home", tier: "T2", group: "Behavior & attendance", type: "categorical", levels: ["no", "yes"], description: "Internet access at home" },
  { name: "famrel", label: "Family relationship quality", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 1, max: 5, step: 1, description: "1 very bad → 5 excellent" },
  { name: "absences", label: "School absences", tier: "T2", group: "Behavior & attendance", type: "numeric", min: 0, max: 93, step: 1, description: "Number of school absences (0–93)" },
  // ---------------- T3 / T4 — Assessment ----------------
  { name: "G1", label: "First period grade (G1)", tier: "T3", group: "Assessment", type: "numeric", min: 0, max: 20, step: 1, description: "First period grade, 0–20" },
  { name: "G2", label: "Second period grade (G2)", tier: "T4", group: "Assessment", type: "numeric", min: 0, max: 20, step: 1, description: "Second period grade, 0–20" },
];

const META_BY_NAME = new Map(FEATURE_META.map((f) => [f.name, f]));

export function featureMeta(name: string): FeatureMeta | undefined {
  return META_BY_NAME.get(name);
}

export interface ValidationIssue {
  feature: string;
  message: string;
}

export interface ValidatedFeatures {
  issues: ValidationIssue[];
  clean: Record<string, string | number>;
}

/**
 * Strict validation against the data dictionary (plan §13.3).
 * Only features belonging to `infoSet` are accepted; unknown keys and
 * tier-mismatched keys are rejected. Numeric strings are coerced.
 */
export function validateFeatures(
  subject: string,
  infoSet: string,
  payload: Record<string, unknown>
): ValidatedFeatures {
  void subject; // ranges/levels are identical for math and por
  const issues: ValidationIssue[] = [];
  const clean: Record<string, string | number> = {};

  const tiers = INFO_SETS[infoSet];
  if (!tiers) {
    issues.push({ feature: "infoSet", message: `Unknown info set "${infoSet}"` });
    return { issues, clean };
  }
  const allowed = new Set<string>();
  for (const t of tiers) for (const c of TIERS[t]) allowed.add(c);

  const seen = new Set<string>();
  for (const meta of FEATURE_META) {
    if (!allowed.has(meta.name)) continue;
    if (!(meta.name in payload)) {
      issues.push({ feature: meta.name, message: `${meta.label} is required for ${infoSet}` });
      continue;
    }
    seen.add(meta.name);
    const v = payload[meta.name];
    if (meta.type === "numeric") {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) {
        issues.push({ feature: meta.name, message: `${meta.label} must be a number` });
        continue;
      }
      const min = meta.min ?? -Infinity;
      const max = meta.max ?? Infinity;
      if (n < min || n > max) {
        issues.push({ feature: meta.name, message: `${meta.label} must be between ${min} and ${max}` });
        continue;
      }
      if (meta.step === 1 && !Number.isInteger(n)) {
        issues.push({ feature: meta.name, message: `${meta.label} must be an integer` });
        continue;
      }
      clean[meta.name] = n;
    } else {
      const s = String(v);
      if (!meta.levels?.includes(s)) {
        issues.push({ feature: meta.name, message: `${meta.label} must be one of: ${meta.levels?.join(", ")}` });
        continue;
      }
      clean[meta.name] = s;
    }
  }

  for (const key of Object.keys(payload)) {
    if (seen.has(key)) continue;
    if (META_BY_NAME.has(key)) {
      issues.push({ feature: key, message: `"${key}" is not available at ${infoSet} (leakage guard)` });
    } else {
      issues.push({ feature: key, message: `Unknown feature "${key}"` });
    }
  }
  return { issues, clean };
}

/** Human descriptors for the information-set ladder (design §11.6). */
export const INFO_SET_META: Record<
  string,
  { label: string; description: string; tiers: string[] }
> = {
  S0: {
    label: "S0 — Background",
    description: "Demographics, family and school context only",
    tiers: ["T0"],
  },
  S1: {
    label: "S1 — + History & support",
    description: "Adds past failures, support structures and aspirations",
    tiers: ["T0", "T1"],
  },
  S2: {
    label: "S2 — + Behavior & attendance",
    description: "Adds study habits, alcohol, health and absences",
    tiers: ["T0", "T1", "T2"],
  },
  S3: {
    label: "S3 — + First period grade (G1)",
    description: "Adds the first period grade G1",
    tiers: ["T0", "T1", "T2", "T3"],
  },
  S4: {
    label: "S4 — + Second period grade (G2)",
    description: "Adds the second period grade G2 (near-oracle setting)",
    tiers: ["T0", "T1", "T2", "T3", "T4"],
  },
  "S2-noabs": {
    label: "S2-noabs — Sensitivity",
    description: "S2 without absences (skewness sensitivity check)",
    tiers: ["T0", "T1", "T2-noabs"],
  },
};

/** Ordered raw feature columns of an info set (delegates to the dataset registry). */
export function infoSetFeatureNames(infoSet: string): string[] {
  const tiers = INFO_SETS[infoSet];
  if (!tiers) throw new Error(`Unknown info set: ${infoSet}`);
  const cols: string[] = [];
  for (const t of tiers) cols.push(...TIERS[t]);
  return Array.from(new Set(cols));
}
