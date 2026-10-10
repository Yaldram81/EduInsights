/* Post-edit engine integrity check: import the engine module (runs module
 * scope incl. the global cache declarations) and exercise cached functions.
 */
import { getTransfer, getOverview } from "../src/lib/ml/engine";

async function main() {
  const tr = getTransfer();
  console.log(
    `[engine] transfer=${tr.map((t) => `${t.direction}:prAuc=${t.prAuc?.toFixed(3)}`).join(" ")}`
  );
  const ov = await getOverview("math");
  console.log(
    `[engine] overview n=${ov.kpis.n} atRiskShare=${ov.kpis.atRiskShare.toFixed(4)} assoc=${ov.associations.length}`
  );
  console.log("ENGINE-CHECK-OK");
}

main().catch((e) => {
  console.error("ENGINE-CHECK-FAIL", e);
  process.exit(1);
});
