/* Seed script (Task 2-a step 3) — plan §13.4.
 * Upserts Dataset + ModelRecord rows, computes the full experiment matrix
 * (ensureMatrix) and the stability / ablation / transfer / subgroup analyses,
 * persisting each as ExperimentRun rows.
 *
 * Run: cd /home/z/my-project && bun scripts/seed.ts
 */

import { db } from "../src/lib/db";
import { loadDataset, rowsFor } from "../src/lib/ml/dataset";
import {
  ensureMatrix,
  getStability,
  getAblation,
  getTransfer,
  getSubgroups,
} from "../src/lib/ml/engine";
import { MODEL_LABELS, MODEL_FAMILY, type ModelKey } from "../src/lib/ml/runner";

const MODEL_TASK: Record<ModelKey, string> = {
  logistic: "classification",
  ridge: "regression",
  tree: "classification|regression",
  forest: "classification|regression",
  majority: "classification",
  mean: "regression",
  rule: "classification",
  g2rule: "regression",
  g1rule: "regression",
};

const MODEL_HYPER: Record<ModelKey, Record<string, unknown>> = {
  logistic: { lambda: 1.0, maxIter: 30, solver: "newton-IRLS", standardized: true },
  ridge: { lambda: 1.0, solver: "cholesky", standardized: true },
  tree: { criterion: "mse-histogram", maxDepth: 4, minLeaf: 10, maxBins: 16 },
  forest: { nTrees: 25, maxDepth: 6, minLeaf: 5, maxBins: 16, mtry: "sqrt(p)" },
  majority: {},
  mean: {},
  rule: { rule: "failures >= 1 OR absences > train median" },
  g2rule: { rule: "G3hat = G2" },
  g1rule: { rule: "G3hat = G1" },
};

const MODEL_NOTES: Record<ModelKey, string> = {
  logistic: "L2-penalized logistic regression (intercept unpenalized) on standardized features",
  ridge: "Linear regression with L2 penalty on standardized features",
  tree: "Histogram CART with MSE gain (depth 4)",
  forest: "Bagged histogram trees, seeded bootstrap, sqrt(p) mtry",
  majority: "Predicts the training positive rate for every row",
  mean: "Predicts the training mean G3 for every row",
  rule: "Hand-crafted risk rule: failures ≥ 1 or above-median absences",
  g2rule: "Naive persistence rule: predicted G3 equals the second period grade",
  g1rule: "Naive persistence rule: predicted G3 equals the first period grade",
};

const ALL_INFO_SETS = ["S0", "S1", "S2", "S3", "S4", "S2-noabs"];
const MODEL_ORDER: ModelKey[] = [
  "logistic", "ridge", "tree", "forest", "majority", "mean", "rule", "g2rule", "g1rule",
];

async function seedDatasets(): Promise<void> {
  const d = loadDataset();
  const specs = [
    {
      subject: "math" as const,
      name: "UCI Student Performance (Mathematics)",
      sha256: "e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80",
      nRows: 395,
    },
    {
      subject: "por" as const,
      name: "UCI Student Performance (Portuguese)",
      sha256: "a7594a11d7771c0efe1a740824e0e833da9c4cad07c39a9766a874575563fb3f",
      nRows: 649,
    },
  ];
  for (const s of specs) {
    const nZeroG3 = rowsFor(s.subject).filter((r) => r.G3 === 0).length;
    const data = {
      subject: s.subject,
      name: s.name,
      sourceUrl: "https://archive.ics.uci.edu/dataset/320/student+performance",
      license: "CC BY 4.0",
      version: "2023-05",
      sha256: s.sha256,
      nRows: s.nRows,
      nFeatures: 33,
      nZeroG3,
      notes: `Real UCI data. ${nZeroG3} students with G3 = 0 (pass mark 10). ${d.nMatchedPairs} matched cross-subject pairs.`,
    };
    await db.dataset.upsert({ where: { subject: s.subject }, create: data, update: data });
  }
  console.log(`[seed] datasets upserted: ${specs.length} (math nZeroG3=${specs[0] ? rowsFor("math").filter((r) => r.G3 === 0).length : "?"})`);
}

async function seedModels(): Promise<void> {
  const infoSetsJson = JSON.stringify(ALL_INFO_SETS);
  for (const key of MODEL_ORDER) {
    const data = {
      name: MODEL_LABELS[key],
      family: MODEL_FAMILY[key],
      task: MODEL_TASK[key],
      infoSets: infoSetsJson,
      hyperParams: JSON.stringify(MODEL_HYPER[key]),
      notes: MODEL_NOTES[key],
    };
    const existing = await db.modelRecord.findFirst({ where: { name: data.name } });
    if (existing) {
      await db.modelRecord.update({ where: { id: existing.id }, data });
    } else {
      await db.modelRecord.create({ data });
    }
  }
  console.log(`[seed] model records upserted: ${MODEL_ORDER.length}`);
}

async function upsertRun(
  code: string,
  subject: string,
  task: string,
  infoSet: string,
  model: string,
  metricName: string,
  metrics: unknown,
  nRows: number
): Promise<void> {
  const data = {
    code,
    subject,
    task,
    infoSet,
    model,
    target: task === "classification" ? "at_risk" : "G3",
    nRows,
    metricName,
    metrics: JSON.stringify(metrics),
    foldScores: JSON.stringify([]),
    oofProbs: null,
    config: JSON.stringify({ kind: code, generatedBy: "scripts/seed.ts" }),
  };
  await db.experimentRun.upsert({
    where: {
      code_subject_task_infoSet_model: { code, subject, task, infoSet, model },
    },
    create: data,
    update: data,
  });
}

async function seedAnalyses(): Promise<void> {
  const t0 = Date.now();
  await ensureMatrix();
  console.log(`[seed] matrix ready (${Date.now() - t0}ms)`);

  for (const subject of ["math", "por"] as const) {
    const rows = rowsFor(subject);
    const st = await getStability(subject);
    await upsertRun("E-STABILITY", subject, "classification", "S2", "logistic", "meanJaccard", st.logistic, rows.length);
    await upsertRun("E-STABILITY", subject, "classification", "S2", "forest", "meanJaccard", st.forest, rows.length);

    const ab = await getAblation(subject);
    await upsertRun("E-ABLATION", subject, "classification", "S2", "logistic", "prAuc", ab, rows.length);

    const sg = await getSubgroups(subject, "S2");
    await upsertRun("E-SUBGROUPS", subject, "classification", "S2", "logistic", "recall", sg, rows.length);
  }

  const tr = getTransfer();
  await upsertRun("E-TRANSFER", "both", "classification", "S2", "logistic", "prAuc", tr, 1044);

  console.log(`[seed] analyses persisted (stability/ablation/subgroups/transfer) in ${Date.now() - t0}ms`);
}

async function main(): Promise<void> {
  const t0 = Date.now();
  await seedDatasets();
  await seedModels();
  await seedAnalyses();

  const [nDatasets, nModels, nRuns, nPreds, nExpl] = await Promise.all([
    db.dataset.count(),
    db.modelRecord.count(),
    db.experimentRun.count(),
    db.prediction.count(),
    db.explanation.count(),
  ]);
  console.log(
    `[seed] totals: datasets=${nDatasets} models=${nModels} experimentRuns=${nRuns} predictions=${nPreds} explanations=${nExpl}`
  );
  console.log(`[seed] total time ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await db.$disconnect();
  console.log("SEED-OK");
}

main().catch((err) => {
  console.error("SEED-FAIL", err);
  process.exit(1);
});
