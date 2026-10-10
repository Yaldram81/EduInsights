/* Temporary: print real runtime exports of the ml core modules. */
import * as dataset from "../src/lib/ml/dataset";
import * as encode from "../src/lib/ml/encode";
import * as metrics from "../src/lib/ml/metrics";
import * as models from "../src/lib/ml/models";
import * as runner from "../src/lib/ml/runner";
import * as cv from "../src/lib/ml/cv";
import * as conformal from "../src/lib/ml/conformal";
import * as explain from "../src/lib/ml/explain";
import * as logistic from "../src/lib/ml/logistic";
import * as rng from "../src/lib/ml/rng";

const mods: Record<string, Record<string, unknown>> = {
  dataset: dataset as unknown as Record<string, unknown>,
  encode: encode as unknown as Record<string, unknown>,
  metrics: metrics as unknown as Record<string, unknown>,
  models: models as unknown as Record<string, unknown>,
  runner: runner as unknown as Record<string, unknown>,
  cv: cv as unknown as Record<string, unknown>,
  conformal: conformal as unknown as Record<string, unknown>,
  explain: explain as unknown as Record<string, unknown>,
  logistic: logistic as unknown as Record<string, unknown>,
  rng: rng as unknown as Record<string, unknown>,
};

for (const [name, mod] of Object.entries(mods)) {
  console.log(`[${name}]`, Object.keys(mod).sort().join(", "));
}

// tiny runtime probes of shapes I depend on
const d = dataset.loadDataset();
console.log("math rows:", d.math.length, "por rows:", d.por.length, "matched:", d.nMatchedPairs);
console.log("PASS_MARK:", dataset.PASS_MARK, "atRisk(9):", dataset.atRisk(9), "atRisk(10):", dataset.atRisk(10));
console.log("infoSetColumns(S2):", dataset.infoSetColumns("S2").join(","));
console.log("infoSetColumns(S2-noabs):", dataset.infoSetColumns("S2-noabs").length, "cols");

const t = dataset.infoSetColumns("T0" in dataset ? "S0" : "S0");
const types: Record<string, string> = {};
for (const c of t) types[c] = typeof (d.math[0] as unknown as Record<string, unknown>)[c] === "number" ? "numeric" : "categorical";
console.log("S0 types:", JSON.stringify(types));

const enc = encode.encodeOne(
  d.math.slice(0, 20) as unknown as Record<string, string | number>[],
  dataset.infoSetColumns("S2"),
  (r) => (Number(r.G3) < 10 ? 1 : 0)
);
console.log("encodeOne names sample:", enc.enc.names.slice(0, 8).join(" | "), "… p =", enc.enc.p);
console.log("has numMap:", Array.isArray(enc.enc.numMap), "numMap len:", enc.enc.numMap.length);

const r = runner.runCv({
  subject: "math",
  task: "classification",
  infoSet: "S0",
  models: ["logistic"],
  reps: 1,
  folds: 3,
  seed: 42,
  collectOofFor: ["logistic"],
});
console.log("runCv result keys:", Object.keys(r[0]).sort().join(","));
console.log("runCv[0] primary:", r[0].primaryMetric, "folds:", r[0].foldScores.length, "oof:", r[0].oof?.length);
console.log("foldScore[0]:", JSON.stringify(r[0].foldScores[0]));
const agg = runner.aggregateMetric(r, "logistic", "prAuc");
console.log("aggregateMetric prAuc:", JSON.stringify(agg));
