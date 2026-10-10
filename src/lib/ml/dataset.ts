/**
 * Dataset registry — parses the UCI Student Performance CSVs (Cortez & Silva, 2008),
 * defines the information-tier registry (plan §4) and performs cross-subject
 * student matching (plan §3.1) to build `groupId`.
 */

import { readFileSync } from "fs";
import path from "path";

export type Subject = "math" | "por";

/** One raw row, verbatim 33 columns from the source CSV. */
export interface StudentRow {
  idx: number;
  subject: Subject;
  school: string;
  sex: string;
  age: number;
  address: string;
  famsize: string;
  Pstatus: string;
  Medu: number;
  Fedu: number;
  Mjob: string;
  Fjob: string;
  reason: string;
  guardian: string;
  traveltime: number;
  studytime: number;
  failures: number;
  schoolsup: string;
  famsup: string;
  paid: string;
  activities: string;
  nursery: string;
  higher: string;
  internet: string;
  romantic: string;
  famrel: number;
  freetime: number;
  goout: number;
  Dalc: number;
  Walc: number;
  health: number;
  absences: number;
  G1: number;
  G2: number;
  G3: number;
  groupId: number; // student_group_id (plan §3.1)
}

/* ------------------------------------------------------------------ */
/* Tier registry — plan §4 (`configs/tiers.yaml`)                      */
/* ------------------------------------------------------------------ */

export const TIERS: Record<string, string[]> = {
  T0: ["sex", "age", "address", "famsize", "Pstatus", "school", "reason", "traveltime", "Medu", "Fedu", "Mjob", "Fjob", "guardian"],
  T1: ["failures", "nursery", "higher", "schoolsup", "famsup", "paid", "activities"],
  T2: ["studytime", "freetime", "goout", "Dalc", "Walc", "health", "romantic", "internet", "famrel", "absences"],
  T3: ["G1"],
  T4: ["G2"],
};

export const INFO_SETS: Record<string, string[]> = {
  S0: ["T0"],
  S1: ["T0", "T1"],
  S2: ["T0", "T1", "T2"],
  S3: ["T0", "T1", "T2", "T3"],
  S4: ["T0", "T1", "T2", "T3", "T4"],
  "S2-noabs": ["T0", "T1", "T2-noabs"],
};

TIERS["T2-noabs"] = TIERS.T2.filter((c) => c !== "absences");

export const INFO_SET_ORDER = ["S0", "S1", "S2", "S3", "S4"] as const;
export type InfoSetName = (typeof INFO_SET_ORDER)[number];

/** Resolve the raw feature columns of an information set. */
export function infoSetColumns(setName: string): string[] {
  const tiers = INFO_SETS[setName];
  if (!tiers) throw new Error(`Unknown info set: ${setName}`);
  const cols: string[] = [];
  for (const t of tiers) cols.push(...TIERS[t]);
  const unique = Array.from(new Set(cols));
  assertNoLeakage(unique, setName);
  return unique;
}

/** Leakage guard — plan §11 mandatory tests. Throws on any violation. */
export function assertNoLeakage(cols: string[], setName: string): void {
  if (cols.includes("G3")) throw new Error(`Target leaked into features (${setName})`);
  const early = setName === "S0" || setName === "S1" || setName === "S2" || setName === "S2-noabs";
  if (early && (cols.includes("G1") || cols.includes("G2"))) {
    throw new Error(`Grades leaked into early set ${setName}`);
  }
  if (setName === "S3" && cols.includes("G2")) throw new Error("G2 leaked into S3");
}

/* ------------------------------------------------------------------ */
/* CSV parsing (semicolon-delimited, quoted strings)                   */
/* ------------------------------------------------------------------ */

function parseCsv(content: string): { header: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

const NUMERIC_COLS = new Set([
  "age", "Medu", "Fedu", "traveltime", "studytime", "failures", "famrel",
  "freetime", "goout", "Dalc", "Walc", "health", "absences", "G1", "G2", "G3",
]);

/* ------------------------------------------------------------------ */
/* Cross-subject student matching — plan §3.1 (`student-merge.R`)      */
/* ------------------------------------------------------------------ */

const MATCH_COLUMNS = [
  "school", "sex", "age", "address", "famsize", "Pstatus", "Medu", "Fedu",
  "Mjob", "Fjob", "reason", "nursery", "internet",
] as const;

function matchKey(r: Record<string, string | number>): string {
  return MATCH_COLUMNS.map((c) => String(r[c])).join("|");
}

export interface LoadedData {
  math: StudentRow[];
  por: StudentRow[];
  /** students appearing in both subject files (plan §3.1: ≈382) */
  nMatchedPairs: number;
  unmatchedMath: number;
  unmatchedPor: number;
}

let cache: LoadedData | null = null;

/** Load both subject files, assign student_group_id, and cache. */
export function loadDataset(): LoadedData {
  if (cache) return cache;
  const rawDir = path.join(process.cwd(), "data", "raw");
  const mathCsv = parseCsv(readFileSync(path.join(rawDir, "student-mat.csv"), "utf-8"));
  const porCsv = parseCsv(readFileSync(path.join(rawDir, "student-por.csv"), "utf-8"));

  const toRow = (
    vals: string[],
    header: string[],
    idx: number,
    subject: Subject
  ): StudentRow => {
    const rec: Record<string, string | number> = {};
    header.forEach((col, i) => {
      const raw = vals[i];
      rec[col] = NUMERIC_COLS.has(col) ? Number(raw) : raw;
    });
    return {
      idx,
      subject,
      school: rec.school as string,
      sex: rec.sex as string,
      age: rec.age as number,
      address: rec.address as string,
      famsize: rec.famsize as string,
      Pstatus: rec.Pstatus as string,
      Medu: rec.Medu as number,
      Fedu: rec.Fedu as number,
      Mjob: rec.Mjob as string,
      Fjob: rec.Fjob as string,
      reason: rec.reason as string,
      guardian: rec.guardian as string,
      traveltime: rec.traveltime as number,
      studytime: rec.studytime as number,
      failures: rec.failures as number,
      schoolsup: rec.schoolsup as string,
      famsup: rec.famsup as string,
      paid: rec.paid as string,
      activities: rec.activities as string,
      nursery: rec.nursery as string,
      higher: rec.higher as string,
      internet: rec.internet as string,
      romantic: rec.romantic as string,
      famrel: rec.famrel as number,
      freetime: rec.freetime as number,
      goout: rec.goout as number,
      Dalc: rec.Dalc as number,
      Walc: rec.Walc as number,
      health: rec.health as number,
      absences: rec.absences as number,
      G1: rec.G1 as number,
      G2: rec.G2 as number,
      G3: rec.G3 as number,
      groupId: 0,
    };
  };

  const groupOfKey = new Map<string, number>();
  let nextGroup = 0;
  const assignGroup = (r: Record<string, string | number>): number => {
    const k = matchKey(r);
    let g = groupOfKey.get(k);
    if (g === undefined) {
      g = nextGroup++;
      groupOfKey.set(k, g);
    }
    return g;
  };

  const math = mathCsv.rows.map((v, i) => {
    const r = toRow(v, mathCsv.header, i, "math");
    r.groupId = assignGroup(r as unknown as Record<string, string | number>);
    return r;
  });
  const por = porCsv.rows.map((v, i) => {
    const r = toRow(v, porCsv.header, i, "por");
    r.groupId = assignGroup(r as unknown as Record<string, string | number>);
    return r;
  });

  // Count matched pairs: groups with rows in both subjects
  const mathGroups = new Set(math.map((r) => r.groupId));
  const porGroups = new Set(por.map((r) => r.groupId));
  let nMatchedPairs = 0;
  for (const g of mathGroups) if (porGroups.has(g)) nMatchedPairs++;

  cache = {
    math,
    por,
    nMatchedPairs,
    unmatchedMath: math.length - nMatchedPairs,
    unmatchedPor: por.length - nMatchedPairs,
  };
  return cache;
}

/** Rows for a subject, or pooled rows ("both"). */
export function rowsFor(subject: Subject | "both"): StudentRow[] {
  const d = loadDataset();
  if (subject === "math") return d.math;
  if (subject === "por") return d.por;
  return [...d.math, ...d.por];
}

/* ------------------------------------------------------------------ */
/* Targets — plan §5                                                   */
/* ------------------------------------------------------------------ */

export const PASS_MARK = 10;
/** Classification target: at_risk = (G3 < 10). */
export function atRisk(y: number): 0 | 1 {
  return y < PASS_MARK ? 1 : 0;
}
