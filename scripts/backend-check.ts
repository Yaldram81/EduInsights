/* Task 2-a step-0 preflight (spec-exact):
 * import runCv + aggregateMetric, compute math/S2/classification/logistic
 * with 2 reps × 3 folds, print the prAuc aggregate.
 * Run: cd /home/z/my-project && bun scripts/backend-check.ts > /tmp/bc.txt 2>&1
 */
import { runCv, aggregateMetric } from "../src/lib/ml/runner";

function main() {
  const t0 = Date.now();
  const runs = runCv({
    subject: "math",
    task: "classification",
    infoSet: "S2",
    models: ["logistic"],
    reps: 2,
    folds: 3,
    seed: 42,
  });
  const agg = aggregateMetric(runs, "logistic", "prAuc");
  console.log(
    `[runner] math/S2/classification/logistic prAuc=${agg ? agg.mean.toFixed(4) : "null"} sd=${agg ? agg.sd.toFixed(4) : "—"} ci=[${agg ? agg.ci.map((v) => v.toFixed(3)).join(",") : "—"}] n=${agg?.n}`
  );
  console.log(`[timing] ${Date.now() - t0}ms`);
  console.log("BACKEND-CHECK-OK");
}

main();
