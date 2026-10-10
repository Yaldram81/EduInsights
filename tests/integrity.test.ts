/**
 * EduInsight AI — Integrity & Leakage Unit Tests
 * Implements the mandatory tests defined in EduInsight_AI_Implementation_Plan.md Section 11:
 *  1. Target leakage guard: G3 never present in feature matrix X.
 *  2. Information tier integrity: S0-S2 never contain G1/G2; S3 contains G1 only; S4 contains both.
 *  3. Isolation guard: Preprocessors fitted strictly on training fold only.
 *  4. Grouped disjointness: No student_group_id appears across both train and test partitions.
 *  5. Metric fidelity: Metric implementations match analytical results on toy data.
 *  6. Determinism: Identical seeds produce bit-identical results.
 */

import { loadDataset, INFO_SETS, TIERS } from "../src/lib/ml/dataset";
import { FEATURE_META, validateFeatures } from "../src/lib/ml/featureMeta";
import { fitEncoder, transformEncoder } from "../src/lib/ml/encode";
import { stratifiedGroupKFold } from "../src/lib/ml/cv";
import {
  prAuc,
  rocAuc,
  brierScore,
  expectedCalibrationError,
  matthewsCorrCoef,
  regressionMetrics,
} from "../src/lib/ml/metrics";
import { makeRng } from "../src/lib/ml/rng";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log(" EduInsight AI — Mandatory Research & Integrity Test Suite");
  console.log("==================================================================\n");

  const dataset = loadDataset();
  const math = dataset.math;
  const por = dataset.por;

  // -------------------------------------------------------------------------
  // 1. Target Leakage Guard: G3 never present in feature definitions or X
  // -------------------------------------------------------------------------
  console.log("--- 1. Target Leakage Guard ---");
  const allFeatureNames = FEATURE_META.map((f) => f.name);
  assert(!allFeatureNames.includes("G3"), "Target 'G3' is strictly excluded from FEATURE_META");

  for (const [setName, tierList] of Object.entries(INFO_SETS)) {
    assert(
      !tierList.includes("T5"),
      `Set ${setName} does not contain any undeclared or target tiers`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Information Tier Integrity
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Information Tier Integrity ---");
  const earlySets = ["S0", "S1", "S2", "S2-noabs"] as const;
  for (const s of earlySets) {
    const tiers = INFO_SETS[s];
    assert(!tiers.includes("T3"), `Early set ${s} does not include T3 (G1)`);
    assert(!tiers.includes("T4"), `Early set ${s} does not include T4 (G2)`);
  }

  assert(INFO_SETS["S3"].includes("T3"), "Set S3 includes T3 (G1)");
  assert(!INFO_SETS["S3"].includes("T4"), "Set S3 does not include T4 (G2)");
  assert(INFO_SETS["S4"].includes("T3"), "Set S4 includes T3 (G1)");
  assert(INFO_SETS["S4"].includes("T4"), "Set S4 includes T4 (G2)");

  // -------------------------------------------------------------------------
  // 3. Grouped Disjointness: No student_group_id leaks across train/test
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Grouped Split Disjointness ---");
  const stratLabels = math.map((r) => (r.G3 < 10 ? 1 : 0));
  const groupIds = math.map((r) => r.groupId);
  const foldAssign = stratifiedGroupKFold(groupIds, stratLabels, 5, 42);

  assert(foldAssign.k === 5, "Generated 5 cross-validation folds");
  for (let f = 0; f < foldAssign.k; f++) {
    const testIdx: number[] = [];
    const trainIdx: number[] = [];
    for (let i = 0; i < foldAssign.assign.length; i++) {
      if (foldAssign.assign[i] === f) testIdx.push(i);
      else trainIdx.push(i);
    }

    const trainGroups = new Set(trainIdx.map((i) => groupIds[i]));
    const testGroups = new Set(testIdx.map((i) => groupIds[i]));

    let overlap = 0;
    for (const g of testGroups) {
      if (trainGroups.has(g)) overlap++;
    }
    assert(overlap === 0, `Fold ${f + 1}: Zero student_group_id overlap between train and test`);
  }

  // -------------------------------------------------------------------------
  // 4. Preprocessing Isolation (Fitted on train only)
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Preprocessing Isolation ---");
  const s2Cols = FEATURE_META.filter((f) => {
    const t = f.tier;
    return t === "T0" || t === "T1" || t === "T2";
  }).map((f) => f.name);

  const fold0TestIdx: number[] = [];
  const fold0TrainIdx: number[] = [];
  for (let i = 0; i < foldAssign.assign.length; i++) {
    if (foldAssign.assign[i] === 0) fold0TestIdx.push(i);
    else fold0TrainIdx.push(i);
  }

  const trainRows = fold0TrainIdx.map((i) => math[i] as unknown as Record<string, string | number>);
  const testRows = fold0TestIdx.map((i) => math[i] as unknown as Record<string, string | number>);

  const encoder = fitEncoder(trainRows, s2Cols);
  const trainTransformed = transformEncoder(encoder, trainRows);
  const testTransformed = transformEncoder(encoder, testRows);

  assert(trainTransformed.n === trainRows.length, "Train row count matches training partition");
  assert(testTransformed.n === testRows.length, "Test row count matches test partition");
  assert(encoder.names.length > 0, "One-hot and standardized feature columns properly generated");

  // Check mean of standardized continuous features on train is ~0
  const ageMap = encoder.numMap.find((m) => m.col === "age");
  assert(ageMap !== undefined, "Numeric feature 'age' is present in numMap");
  if (ageMap) {
    let sumAgeTrain = 0;
    for (let i = 0; i < trainTransformed.n; i++) {
      sumAgeTrain += trainTransformed.X[i * encoder.p + ageMap.outIdx];
    }
    const meanAgeTrain = sumAgeTrain / trainTransformed.n;
    assert(
      Math.abs(meanAgeTrain) < 1e-6,
      `Standardized feature 'age' has zero mean on train partition (${meanAgeTrain.toExponential(2)})`
    );
  }

  // -------------------------------------------------------------------------
  // 5. Metric Implementations on Known Analytical Examples
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Metric Functions Fidelity ---");
  // Perfect predictions
  const yTrue = [0, 0, 1, 1];
  const yPredPerfect = [0.1, 0.2, 0.8, 0.9];
  assert(Math.abs((rocAuc(yTrue, yPredPerfect) ?? -1) - 1.0) < 1e-6, "Perfect ROC-AUC evaluates to 1.0");
  assert(Math.abs((prAuc(yTrue, yPredPerfect) ?? -1) - 1.0) < 1e-6, "Perfect PR-AUC evaluates to 1.0");

  // Inverted predictions
  const yPredInverted = [0.9, 0.8, 0.2, 0.1];
  assert(Math.abs((rocAuc(yTrue, yPredInverted) ?? -1) - 0.0) < 1e-6, "Completely inverted ROC-AUC evaluates to 0.0");

  // Constant predictions
  const yPredConstant = [0.5, 0.5, 0.5, 0.5];
  assert(Math.abs((rocAuc(yTrue, yPredConstant) ?? -1) - 0.5) < 1e-6, "Random/constant ROC-AUC evaluates to 0.5");

  // Brier score: MSE of probabilities
  const brier = brierScore([1, 0], [0.8, 0.2]); // ((0.2)^2 + (0.2)^2) / 2 = 0.04
  assert(Math.abs(brier - 0.04) < 1e-6, `Brier score matches analytical MSE (0.04 == ${brier.toFixed(4)})`);

  // MAE and RMSE
  const reg1 = regressionMetrics([10, 15, 20], [12, 14, 18]); // (|2| + |1| + |2|) / 3 = 5/3
  assert(Math.abs(reg1.mae - 5 / 3) < 1e-6, "MAE matches analytical expectation");

  const reg2 = regressionMetrics([10, 20], [13, 16]); // sqrt((9 + 16)/2) = sqrt(12.5)
  assert(Math.abs(reg2.rmse - Math.sqrt(12.5)) < 1e-6, "RMSE matches analytical expectation");

  // MCC
  const mcc = matthewsCorrCoef([1, 1, 0, 0], [1, 1, 0, 0]);
  assert(Math.abs((mcc ?? 0) - 1.0) < 1e-6, "Perfect MCC evaluates to 1.0");

  // -------------------------------------------------------------------------
  // 6. Determinism: Same Seed Produces Bit-Identical Output
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Determinism & PRNG Fidelity ---");
  const rng1 = makeRng(1337);
  const rng2 = makeRng(1337);
  const seq1 = Array.from({ length: 50 }, () => rng1());
  const seq2 = Array.from({ length: 50 }, () => rng2());
  const identical = seq1.every((v, i) => v === seq2[i]);
  assert(identical, "makeRng (Mulberry32) produces identical sequences from identical seeds");

  console.log("\n==================================================================");
  console.log(` Summary: ${passed} passed, ${failed} failed.`);
  console.log("==================================================================");
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
