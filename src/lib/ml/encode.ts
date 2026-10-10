/**
 * Preprocessing fitted on training folds only (plan §7.4):
 * one-hot encoding for categorical columns (drop-first reference level),
 * standardization (z-score) for numeric columns. Unknown categories at
 * transform time map to the reference (all-zero) block — never an error.
 */

export type ColType = "categorical" | "numeric";

export interface ColSpec {
  name: string;
  type: ColType;
}

export interface FittedEncoder {
  /** output column names, aligned with the design matrix layout */
  names: string[];
  /** input feature columns */
  inputCols: string[];
  catLevels: Record<string, string[]>;
  /** per input column: [index into output, list of output names] */
  catMap: Array<{ col: string; start: number; levels: string[] }>;
  numMap: Array<{ col: string; outIdx: number; mean: number; std: number }>;
  p: number;
}

const isNumeric = (v: string | number): v is number => typeof v === "number";

export function colTypes(rows: Record<string, string | number>[], cols: string[]): ColSpec[] {
  return cols.map((name) => {
    const v = rows[0][name];
    return { name, type: isNumeric(v) ? "numeric" : "categorical" };
  });
}

export function fitEncoder(
  rows: Record<string, string | number>[],
  cols: string[],
  types?: Record<string, ColType>
): FittedEncoder {
  const specs = types
    ? cols.map((c) => ({ name: c, type: types[c] ?? "categorical" as ColType }))
    : colTypes(rows, cols);

  const catLevels: Record<string, string[]> = {};
  for (const s of specs) {
    if (s.type === "categorical") {
      const vals = new Set<string>();
      for (const r of rows) vals.add(String(r[s.name]));
      catLevels[s.name] = Array.from(vals).sort();
    }
  }

  const names: string[] = [];
  const catMap: FittedEncoder["catMap"] = [];
  const numMap: FittedEncoder["numMap"] = [];
  let p = 0;

  // Categorical: drop-first (first level alphabetically = reference)
  for (const s of specs) {
    if (s.type !== "categorical") continue;
    const levels = catLevels[s.name];
    const nonRef = levels.slice(1);
    catMap.push({ col: s.name, start: p, levels: nonRef });
    for (const lv of nonRef) {
      names.push(`${s.name}=${lv}`);
      p++;
    }
  }
  // Numeric: standardize
  for (const s of specs) {
    if (s.type !== "numeric") continue;
    const vals = rows.map((r) => Number(r[s.name]));
    const n = vals.length || 1;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, n - 1);
    const std = Math.sqrt(variance) || 1;
    numMap.push({ col: s.name, outIdx: p, mean, std });
    names.push(s.name);
    p++;
  }

  return { names, inputCols: cols, catLevels, catMap, numMap, p };
}

export function transformEncoder(
  enc: FittedEncoder,
  rows: Record<string, string | number>[]
): { X: Float64Array; n: number; p: number } {
  const n = rows.length;
  const X = new Float64Array(n * enc.p);
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    for (const cm of enc.catMap) {
      const v = String(row[cm.col]);
      const k = cm.levels.indexOf(v);
      if (k >= 0) X[i * enc.p + cm.start + k] = 1;
      // unknown level → all zeros (reference)
    }
    for (const nm of enc.numMap) {
      X[i * enc.p + nm.outIdx] = (Number(row[nm.col]) - nm.mean) / nm.std;
    }
  }
  return { X, n, p: enc.p };
}

export interface Encoded {
  X: Float64Array;
  n: number;
  p: number;
  enc: FittedEncoder;
  y: Float64Array;
}

/** Fit encoder on `trainRows`, transform both splits. */
export function encodeSplits(
  trainRows: Record<string, string | number>[],
  testRows: Record<string, string | number>[],
  cols: string[],
  target: (r: Record<string, string | number>) => number,
  types?: Record<string, ColType>
): { train: Encoded; test: Encoded } {
  const enc = fitEncoder(trainRows, cols, types);
  const t1 = transformEncoder(enc, trainRows);
  const t2 = transformEncoder(enc, testRows);
  return {
    train: { ...t1, enc, y: Float64Array.from(trainRows.map(target)) },
    test: { ...t2, enc, y: Float64Array.from(testRows.map(target)) },
  };
}

export function encodeOne(
  rows: Record<string, string | number>[],
  cols: string[],
  target: (r: Record<string, string | number>) => number,
  types?: Record<string, ColType>
): Encoded {
  const enc = fitEncoder(rows, cols, types);
  const t = transformEncoder(enc, rows);
  return { ...t, enc, y: Float64Array.from(rows.map(target)) };
}
