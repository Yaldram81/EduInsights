/* Engine smoke — exercises every engine function against the real dataset.
 * Run with: bun scripts/engine-smoke.ts
 */
import {
  getOverview,
  getStability,
  getTransfer,
  getSubgroups,
  getPredictArtifact,
  predictRisk,
  explainPrediction,
  getExperiments,
  getHypotheses,
  getAblation,
  getOof,
} from "../src/lib/ml/engine";

async function main() {
  const t0 = Date.now();
  const log = (k: string, v: unknown) => console.log(`[${k}]`, typeof v === "string" ? v : JSON.stringify(v));

  const ov = await getOverview("math");
  log("overview.kpis", ov.kpis);
  log("overview.topAssoc", ov.associations.slice(0, 3).map((a) => `${a.feature}:${a.effect}=${a.value.toFixed(3)},q=${a.q.toFixed(3)}`));
  log("overview.ridgeline", ov.ridgeline.map((r) => `${r.grade}:${r.points.length}pts`));
  log("overview.zeroCluster", ov.g3ZeroCluster);

  const tr = getTransfer();
  log("transfer", tr.map((t) => `${t.direction} nTest=${t.nTest} prAuc=${t.prAuc?.toFixed(3)} rocAuc=${t.rocAuc?.toFixed(3)}`));

  const st = await getStability("math");
  log("stability.logistic", { meanJaccard: st.logistic.meanJaccard.toFixed(3), kendall: st.logistic.kendall.toFixed(3), top: st.logistic.seeds[0].top.slice(0, 3).map((t) => `${t.feature}:${t.score.toFixed(3)}`) });
  log("stability.forest", { meanJaccard: st.forest.meanJaccard.toFixed(3), top: st.forest.seeds[0].top.slice(0, 3).map((t) => `${t.feature}:${t.score.toFixed(3)}`) });
  log("stability.crossModelJaccard", st.crossModelJaccard.toFixed(3));

  const sg = await getSubgroups("math");
  log("subgroups.overall", sg.overall);
  log("subgroups.sex", sg.groups[0].levels.map((l) => `${l.level}: n=${l.n} recall=${l.recall.toFixed(3)} ci=[${l.ciRecall?.map((v) => v.toFixed(2)).join(",")}]`));

  const art = getPredictArtifact("math", "S2");
  log("artifact", { p: art.featureNames.length, baseRate: art.baseRate.toFixed(3), ece: art.ece, qInterval: art.cal.qInterval.toFixed(3), nRows: art.nRows });

  const features = {
    school: "GP", sex: "F", age: 18, address: "U", famsize: "GT3", Pstatus: "A",
    Medu: 4, Fedu: 4, Mjob: "at_home", Fjob: "teacher", reason: "course", guardian: "mother",
    traveltime: 2, failures: 1, nursery: "yes", higher: "yes", schoolsup: "no", famsup: "yes",
    paid: "no", activities: "no", studytime: 2, freetime: 3, goout: 3, Dalc: 1, Walc: 1,
    health: 3, romantic: "no", internet: "yes", famrel: 4, absences: 14,
  };
  const pr = await predictRisk("math", "S2", features);
  log("predict", { id: pr.id, p: pr.probability.toFixed(4), logOdds: pr.logOdds.toFixed(3), interval: pr.interval.map((v) => v.toFixed(3)), set: pr.conformalSet, level: pr.riskLevel, model: pr.model });
  log("predict.top3", pr.contributions.slice(0, 3).map((c) => `${c.feature}=${c.value} ${c.contribution.toFixed(3)} ${c.direction}`));
  log("predict.otherFactors", pr.otherFactors);

  if (pr.id) {
    const ex = await explainPrediction(pr.id);
    log("explain", { n: ex.contributions.length, baseRate: ex.baseRate.toFixed(3), final: ex.finalProbability.toFixed(4), note: ex.note });
  }

  const exp = await getExperiments("math", "classification");
  log("experiments", { nRuns: exp.runs.length, first: exp.runs[0] ? { infoSet: exp.runs[0].infoSet, model: exp.runs[0].model, p: exp.runs[0].nFeatures, keys: Object.keys(exp.runs[0].metrics), prAuc: exp.runs[0].metrics.prAuc } : null });

  const oof = await getOof("math", "classification", "S2", "logistic");
  log("oof", { n: oof.y.length, positives: oof.y.reduce((a, b) => a + b, 0) });

  const ab = await getAblation("math");
  log("ablation", { full: ab.full.mean.toFixed(3), dropped: ab.dropped.map((d) => `${d.group}: ${d.mean.toFixed(3)} (Δ${d.delta.toFixed(3)})`) });

  const hy = await getHypotheses("math");
  log("hypotheses", hy.hypotheses.map((h) => `${h.id}:${h.status}`));
  for (const h of hy.hypotheses) console.log(`  ${h.id} → ${h.result}`);

  console.log(`[timing] engine smoke in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("ENGINE-SMOKE-OK");
}

main().catch((e) => {
  console.error("SMOKE-FAIL", e);
  process.exit(1);
});
