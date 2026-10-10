/* API smoke — hits every backend endpoint on the running dev server and
 * prints a labeled, compact report.
 * Run: bun scripts/api-smoke.ts > /tmp/api-report.txt 2>&1
 */

const BASE = "http://localhost:3000";

const GOOD_FEATURES = {
  school: "GP", sex: "F", age: 18, address: "U", famsize: "GT3", Pstatus: "A",
  Medu: 4, Fedu: 4, Mjob: "at_home", Fjob: "teacher", reason: "course", guardian: "mother",
  traveltime: 2, failures: 1, nursery: "yes", higher: "yes", schoolsup: "no", famsup: "yes",
  paid: "no", activities: "no", studytime: 2, freetime: 3, goout: 3, Dalc: 1, Walc: 1,
  health: 3, romantic: "no", internet: "yes", famrel: 4, absences: 14,
};

function clip(v: unknown, n = 260): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? `${s.slice(0, n)}…(${s.length} chars)` : s;
}

async function get(label: string, path: string, pick?: (j: unknown) => unknown) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    const shown = pick && parsed !== null ? pick(parsed) : clip(parsed ?? text);
    console.log(`[${label}] status=${res.status} ms=${Date.now() - t0} → ${clip(shown)}`);
  } catch (err) {
    console.log(`[${label}] FETCH-FAIL ${String(err).slice(0, 200)}`);
  }
}

async function post(label: string, path: string, body: unknown) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    console.log(`[${label}] status=${res.status} ms=${Date.now() - t0} → ${clip(parsed ?? text)}`);
    return { status: res.status, json: parsed as Record<string, unknown> | null };
  } catch (err) {
    console.log(`[${label}] FETCH-FAIL ${String(err).slice(0, 200)}`);
    return { status: 0, json: null };
  }
}

async function main() {
  await get("health", "/api/health", (j) => {
    const h = j as { status?: string; engine?: string; counts?: unknown; datasets?: unknown[] };
    return { status: h.status, engine: h.engine, counts: h.counts, nDatasets: h.datasets?.length };
  });

  await get("overview?subject=math", "/api/overview?subject=math", (j) => {
    const o = j as {
      kpis?: { n?: number; atRiskShare?: number; meanG3?: number };
      associations?: unknown[];
      distributions?: unknown[];
      ridgeline?: unknown[];
      absencesHist?: unknown[];
      riskBySubgroup?: unknown[];
      g3ZeroCluster?: unknown;
    };
    return {
      kpis: o.kpis,
      topAssoc: o.associations?.slice(0, 2),
      nDist: o.distributions?.length,
      nRidge: o.ridgeline?.length,
      nAbsHist: o.absencesHist?.length,
      nSubgroups: o.riskBySubgroup?.length,
      g3ZeroCluster: o.g3ZeroCluster,
    };
  });

  await get("overview?subject=both", "/api/overview?subject=both", (j) => {
    const o = j as { kpis?: { n?: number; matchedPairs?: number } };
    return o.kpis;
  });

  await get("experiments?subject=math&task=classification", "/api/experiments?subject=math&task=classification", (j) => {
    const e = j as { subject?: string; task?: string; runs?: { infoSet: string; model: string; nFeatures: number; metrics: Record<string, { mean: number } | null> }[] };
    const s2log = e.runs?.find((r) => r.infoSet === "S2" && r.model === "logistic");
    return {
      subject: e.subject,
      task: e.task,
      nRuns: e.runs?.length,
      first: e.runs?.[0] ? { infoSet: e.runs[0].infoSet, model: e.runs[0].model, p: e.runs[0].nFeatures } : null,
      s2LogisticPrAuc: s2log?.metrics.prAuc?.mean,
    };
  });

  await get("experiments?subject=por&task=regression", "/api/experiments?subject=por&task=regression", (j) => {
    const e = j as { runs?: { infoSet: string; model: string; metrics: Record<string, { mean: number } | null> }[] };
    const s4ridge = e.runs?.find((r) => r.infoSet === "S4" && r.model === "ridge");
    return { nRuns: e.runs?.length, s4RidgeMae: s4ridge?.metrics.mae?.mean };
  });

  await get("oof", "/api/experiments/oof?subject=math&task=classification&infoSet=S2&model=logistic", (j) => {
    const o = j as { y?: number[]; pred?: number[] };
    return { n: o.y?.length, positives: o.y?.reduce((a: number, b: number) => a + b, 0), pred0: o.pred?.[0] };
  });

  await get("hypotheses?subject=math", "/api/experiments/hypotheses?subject=math", (j) => {
    const h = j as { hypotheses?: { id: string; status: string; result: string }[] };
    return h.hypotheses?.map((x) => `${x.id}:${x.status}`);
  });

  await get("stability?subject=math", "/api/experiments/stability?subject=math", (j) => {
    const s = j as { logistic?: { meanJaccard?: number; kendall?: number; top?: { feature: string }[] } };
    return { meanJaccard: s.logistic?.meanJaccard, kendall: s.logistic?.kendall, top3: s.logistic?.top?.slice(0, 3).map((t) => t.feature) };
  });

  await get("ablation?subject=math", "/api/experiments/ablation?subject=math", (j) => {
    const a = j as { full?: { mean?: number }; dropped?: { group: string; mean: number; delta: number }[] };
    return { full: a.full?.mean, dropped: a.dropped?.map((d) => `${d.group}:${d.delta.toFixed(3)}`) };
  });

  await get("transfer", "/api/transfer", (j) => {
    const t = j as { transfers?: { direction: string; nTrain: number; nTest: number; prAuc: number | null }[] };
    return t.transfers?.map((x) => `${x.direction} nTrain=${x.nTrain} nTest=${x.nTest} prAuc=${x.prAuc?.toFixed(3)}`);
  });

  await get("subgroups?subject=math", "/api/subgroups?subject=math", (j) => {
    const s = j as { overall?: { recall?: number; brier?: number }; groups?: { feature: string; levels: { level: string; n: number; recall: number }[] }[] };
    const sex = s.groups?.find((g) => g.feature === "sex");
    return { overall: s.overall, sex: sex?.levels.map((l) => `${l.level}:n=${l.n},rec=${l.recall.toFixed(3)}`) };
  });

  await get("meta", "/api/meta", (j) => {
    const m = j as { featureMeta?: unknown[]; infoSets?: unknown; models?: unknown };
    return { nFeatures: m.featureMeta?.length, infoSets: Object.keys((m.infoSets ?? {}) as object).join(","), nModels: Object.keys((m.models ?? {}) as object).length };
  });

  // ---- predict (good) ----
  const pr = await post("predict-good", "/api/predict", {
    subject: "math",
    infoSet: "S2",
    features: GOOD_FEATURES,
  });
  const pj = pr.json as {
    id?: string;
    probability?: number;
    logOdds?: number;
    interval?: number[];
    conformalSet?: number[];
    riskLevel?: string;
    contributions?: { feature: string; contribution: number }[];
    otherFactors?: unknown;
    model?: unknown;
  } | null;
  console.log(
    `[predict-good.detail] p=${pj?.probability?.toFixed(4)} logOdds=${pj?.logOdds?.toFixed(3)} interval=[${pj?.interval?.map((v) => v.toFixed(3)).join(",")}] set=${JSON.stringify(pj?.conformalSet)} level=${pj?.riskLevel} topContribs=${pj?.contributions?.slice(0, 3).map((c) => `${c.feature}:${c.contribution.toFixed(3)}`).join(", ")} otherFactors=${JSON.stringify(pj?.otherFactors)} model=${JSON.stringify(pj?.model)}`
  );

  // ---- explain ----
  if (pj?.id) {
    await post("explain", "/api/explain", { predictionId: pj.id });
  } else {
    console.log("[explain] SKIPPED (no predictionId)");
  }

  // ---- predict (bad: age 99 etc.) → expect 400 + issues ----
  await post("predict-bad", "/api/predict", {
    subject: "math",
    infoSet: "S2",
    features: { age: 99 },
  });

  // ---- predict (bad infoSet) → expect 400 ----
  await post("predict-bad-infoSet", "/api/predict", {
    subject: "math",
    infoSet: "S9",
    features: GOOD_FEATURES,
  });

  // ---- explain (missing id) → expect 404 ----
  await post("explain-missing", "/api/explain", { predictionId: "nonexistent-id-000" });

  console.log("API-SMOKE-DONE");
}

main();
