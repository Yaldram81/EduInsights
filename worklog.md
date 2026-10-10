# EduInsight AI — Build Worklog

Project: EduInsight AI — explainable learning analytics & student-risk research platform.
Source specs: `upload/EduInsight_AI_Implementation_Plan.md` (research plan) + `upload/design.md` ("Obsidian & Champagne" design system).

---
Task ID: 0
Agent: main (orchestrator)
Task: Project setup — dataset acquisition, schema planning, worklog init

Work Log:
- Read both specification files end-to-end.
- Acquired the REAL UCI Student Performance dataset from archive.ics.uci.edu into `data/raw/`:
  - `student-mat.csv` (395 students + header), sha256 e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80
  - `student-por.csv` (649 students + header), sha256 a7594a11d7771c0efe1a740824e0e833da9c4cad07c39a9766a874575563fb3f
  - `student.txt` (attribute documentation), `student-merge.R` (matching rule source)
- Inspected scaffold: Next.js 16 App Router, Tailwind v4 (CSS-first), shadcn/ui full set, Prisma+SQLite (`db/custom.db`), recharts, framer-motion available.

Stage Summary:
- Plan: single route `/` with hash-based views (Landing/Overview/Experiments/Predict/About) per sandbox routing constraint.
- Real ML in TypeScript: logistic (IRLS), ridge, histogram CART, random forest, grouped stratified CV, conformal uncertainty, linear-SHAP + tree-interpreter explanations. All numbers real, computed from the genuine dataset.
- No other agent work yet.

---
Task ID: 1
Agent: main (orchestrator)
Task: Core ML engine in TypeScript — verified against the real UCI dataset

Work Log:
- Built and runtime-verified `src/lib/ml/`: rng (mulberry32), dataset (CSV parse + 13-column cross-subject matching → 366 matched pairs), encode (one-hot drop-first + z-score, fitted train-only), metrics (ROC/PR-AUC, ECE, Brier, MCC, top-k, Spearman, Nadeau–Bengio corrected t, Holm/BH, reliability curve), solve (Cholesky+jitter), logistic (additive-gradient IRLS — fixed a Newton-form bug; converges in ~5 iters with correct parameters), models (ridge, histogram CART, bagged forest, rule baselines), cv (stratified group k-fold + leakage guard), conformal (split conformal intervals/sets, Vovk ⌈(m+1)(1−α)⌉/m quantile), explain (exact linear contributions, tree-interpreter, Jaccard/Kendall stability), runner (repeated 5×3 stratified grouped CV, identical folds across tiers/models, OOF collection).
- Environment note: tool-result echoes are unreliable/garbled; all verification done via `bun script > file` + Read. Files land correctly; trust execution + Read only.
- Real-data sanity: math S2 classification logistic PR-AUC ≈ 0.552 (10 folds, 80ms); regression S4: G3=G2 rule MAE 0.962 vs ridge 1.356 (H3-predicted); leakage + grouped-disjoint guards pass.

Stage Summary:
- Core ML stack complete and verified. Remaining: engine orchestrator, seed script, API routes (Task 2-a), full frontend (Task 2-b).
- Prisma schema (Dataset/ModelRecord/ExperimentRun/Prediction/Explanation) pushed to db/custom.db.
- Raw data pinned in data/raw with SHA-256 checksums.

---
Task ID: 2-a
Agent: backend-builder
Task: Engine orchestrator, seed script, API routes

Work Log:
- Verified the Task-1 core by execution first (`scripts/backend-check.ts`: math/S2/classification/logistic 2 reps × 3 folds → prAuc = 0.5339, sd 0.0488, n=6, identical across 3 runs — reference number for all later refactors).
- `src/lib/ml/featureMeta.ts`: verified compile + 32 entries (FEATURE_META.length=32, info sets S0..S4 + S2-noabs), strict `validateFeatures` (unknown keys, range and level checks, numeric coercion).
- `src/lib/ml/engine.ts` (orchestrator, globalThis-memoized): `ensureMatrix` computes + persists the full matrix — per subject × task × 6 info sets at 3 reps × 5 folds seed 42 (OOF for logistic/ridge) + forest-OOF runs at S2 (H4) + pooled logistic S0–S4 at 2 reps; every run upserted to ExperimentRun (codes E-C-*/E-R-*/E-POOLED-C, DB failures logged not fatal). Added `getOof` (cached concat, else 1-rep on-demand), `getOverview` (KPIs, 21-bin grade distributions, Gaussian-KDE ridgeline with Silverman bandwidth, absences histogram, 8 risk-by-subgroup panels, Cramér's V / Cliff's delta associations with BH q-values, G3=0 cluster, evidence block), `getHypotheses` (H1 adjacent-tier paired corrected-t + Holm on PR-AUC, H2 tree/forest vs logistic Holm-2, H3 ridge−g2rule MAE CI, H4 per-rep ECE forest−logistic, H5 top-8 Jaccard ≥ 0.6, H6 sex recall gap with 1000× bootstrap CI — all report real numbers, nulls honest), `getStability` (5 logistic bootstrap refits seeds 100–104 |β| → raw-name aggregation, 3 forest refits seeds 200–202 with local tree-interpreter over ≤200 rows, mean pairwise Jaccard + Kendall τ + cross-model Jaccard), `getAblation` (drop Background / History & support / Behavior & attendance via local CV on identical folds + absences from the S2-noabs run), `getTransfer` (fit on all of one subject, test on the other's unmatched groupIds), `getSubgroups` (OOF aligned to row indices via a local 5-fold loop, per-level recall/fpr/precision with 500× bootstrap CI and n<30 insufficiency flags), `getPredictArtifact` (stratifiedGroupKFold 4 folds seed 7, folds 0–2 train / fold 3 conformal calibration α=0.1, train-mean reference for contributions), `predictRisk` (validate → 400-style ApiError with per-feature issues; linear contributions aggregated from one-hot to raw columns with display values, top-12 + "(N other factors)" aggregate, conformal interval + set, riskLevel lower/moderate/higher/uncertain, Prediction + ranked Explanation rows persisted), `explainPrediction` (DB-backed, recomputes + persists when Explanation rows are missing), `getExperiments` (matrix aggregates for every metric seen), `getMatrixIfReady` / `startMatrix` warmup. Fixed a latent H4 pairing bug by attaching forest OOF from a dedicated same-seed run (identical folds, paired per rep).
- `scripts/seed.ts`: upserts Dataset rows (math n=395 / por n=649, real sha256 pins, computed nZeroG3 38/40) and 9 ModelRecord rows (family + hyperParams JSON); computes matrix + stability/ablation/subgroups/transfer and persists them as E-STABILITY / E-ABLATION / E-SUBGROUPS / E-TRANSFER runs; ends SEED-OK, exit 1 on error.
- 12 API routes under `src/app/api/` (force-dynamic, uniform error mapping via `src/lib/api/params.ts` → ApiError status/issues or 500): health (DB-backed datasets + counts + seededAt), overview (?subject=math|por|both), experiments (?subject&task, fires `startMatrix()` at module scope for warmup), experiments/oof, experiments/hypotheses, experiments/stability, experiments/ablation, transfer, subgroups (?subject&infoSet), meta (FEATURE_META + INFO_SET_META + MODEL_LABELS), predict (POST, 400 + issues on validation, 400 on bad infoSet, never awaits the matrix), explain (POST, 404 when unknown). NO other routes; page.tsx/layout.tsx/globals.css/src/components untouched; removed the scaffold hello-world api/route.ts.
- Verification (output-file protocol, echoes untrusted — every claim below is from a redirected run read back from disk): tsc --noEmit clean for src/** (fixed 6 latent strict-mode type errors in Task-1 core: dataset.ts toRow/assignGroup casts, explain.ts tree-interpreter instance indexing + bogus overload, runner.ts cast + balancedAcc property — runtime byte-identical, backend-check prAuc unchanged at 0.5339); seed SEED-OK in 15.6s (matrix 137 runs in 14.6s, 137/137 persisted, totals 2 datasets / 9 models / 146 runs); dev-server API smoke all 15 checks green — health 200 (experiments=146), overview math 200 (n=395, atRiskShare=0.329, top association failures Cliff's δ=0.295), overview both 200 (n=1044, matchedPairs=366), experiments math/cls 200 (30 runs, S2 logistic prAuc=0.5528), experiments por/reg 200 (36 runs, S4 ridge mae=0.834), oof 200 (n=1185, 390 positives), hypotheses 200 (H1 supported, H2 supported, H3 not_supported, H4 inconclusive, H5 not_supported, H6 inconclusive), stability 200 (logistic meanJaccard=0.410, kendall=0.423), ablation 200 (full 0.5528; dropping History & support −0.093), transfer 200 (math→por nTest=275 prAuc=0.441, por→math nTest=25 prAuc=0.684), subgroups 200 (overall recall=0.400; sex F rec=0.360 n=208 vs M rec=0.455 n=187), meta 200 (32 features / 6 info sets / 9 models), predict 200 (p=0.3878, conformal set [0,1] → "uncertain", top contributors Pstatus −0.526 / failures +0.501 / Walc +0.423, 18 other factors, model ece=0.1227 n=297), explain 200 (12 ranked contributions), predict-bad 400 with per-feature issues, bad infoSet 400, explain-missing 404; dev server stopped afterwards (pgrep empty).
- Lint: 0 errors in backend files; 1 pre-existing error remains in `src/components/layout/AppShell.tsx:79` (frontend agent's file — src/components/** is out of this task's scope) and 1 benign warning in engine.ts (unused eslint-disable directive; warnings acceptable). Left both untouched.

Stage Summary:
- Backend complete: verified ML core + orchestrator + seed + 12 routes, all real numbers, no mocks, zero route drift from the spec.
- Experiment matrix is memoized per process and warms on module load of /api/experiments; /overview, /predict and /meta never block on it.
- Honest-results policy holds end-to-end: H3 (G3=G2 rule), H4 (calibration) and H6 (sex recall gap) report not_supported/inconclusive where the data says so; stability Jaccard 0.410 < 0.6 → H5 not_supported.
- Handed to frontend (2-b): /api/overview, /api/experiments(+oof,hypotheses,stability,ablation), /api/transfer, /api/subgroups, /api/meta, /api/predict, /api/explain, /api/health — all shapes verified against the smoke report above.

---
Task ID: 2-b
Agent: frontend-builder
Task: EduInsight AI frontend — "Obsidian & Champagne" single-route app over the live backend

Work Log:
- Read worklog.md + upload/design.md end-to-end (854 lines) and inventoried src/: an earlier interrupted agent had left near-complete frontend files, but `bun run lint` reported 1 error and 1 pre-existing warning; verified by execution, not by echo.
- Ground truth via `bunx tsc --noEmit` + `bunx eslint src/components/views/PredictView.tsx`: the only error in scope was `react-hooks/set-state-in-effect` at PredictView.tsx:218 (form-rebuild effect calling setForm/setIssues/setResult/setExplanation/setExplainError synchronously).
- Fix (PredictView.tsx): replaced the reset effect with the derived-state pattern — `defaults` via useMemo (categorical → first level, bounded numeric → mid-range, other → 0, tier-filtered by infoSets[infoSet].tiers), `form = {...defaults, ...overrides}` memo; user edits stored in `overrides`; new `changeSubject`/`changeInfoSet` event handlers clear overrides + issues + result + explanation + explainError (identical UX, lint-clean, useEffect import removed).
- Verified ALL existing spec components on disk are complete and coherent: globals.css (full token set, dark default + light theme, reduced-motion, .glass/.grad-gold/.canvas-atmosphere), layout.tsx (Fraunces/Geist/Geist_Mono → --font-fraunces/--font-geist-sans/--font-geist-mono, data-theme="dark", Toaster, title "EduInsight AI — Evidence, not verdicts."), page.tsx (QueryClientProvider + hashchange routing + scroll-to-top + AppShell + CommandPalette), brand/ (Monogram aperture SVG, Wordmark serif+small-caps AI, ApertureLine), layout/AppShell.tsx (264px sidebar w/ gold rail, sticky glass top bar, theme toggle, mobile bottom tabs, skip link, persistent disclaimer), CommandPalette (⌘K), data/ (KpiCard, EvidenceFooter, RiskBadge, ProbabilityGauge, InformationLadder, SectionHeading, Chips, States, CopyButton), charts/ (AccumulationCurve, ForestPlot, ReliabilityDiagram, DecisionCurve, PrecisionAtK, Waterfall, RidgelineChart, SubgroupForest, StabilitySlope, AblationTable, chartTheme), views/ (Landing, Overview, Experiments, Predict, About), lib/format.ts, lib/client/{api,analyze,oof}.ts.
- Live contract verification (dev server + curl, output files read back): /api/health 200 (math:395, por:649, counts 146/3), /api/overview?subject=math 200 (kpis n=395 atRiskShare=0.3291 meanG3=10.415 zeroG3Share=0.0962; ridgeline G1/G2/G3; 30 associations; 8 riskBySubgroup; evidence.passMark=10), /api/experiments?subject=math&task=classification 200 (30 runs; S2 logistic prAuc mean 0.5528 sd 0.0558 ci [0.5219, 0.5837] n=15), /api/experiments/oof 200 ({y, pred}), /api/experiments/hypotheses 200 (H1–H6), /api/experiments/stability 200 (seeds 100–104 logistic + 200+ forest), /api/experiments/ablation 200 (full 0.5528; History −0.0934, Background +0.0375, absences group present), /api/transfer 200 (math→por prAuc 0.4409; por→math prAuc 0.6839), /api/subgroups 200 (overall recall 0.400 precision 0.5778 ece 0.0895), /api/meta 200 (S0..S4+S2-noabs, 32 features, 9 models incl. g2rule/g1rule), POST /api/predict with empty features → 400 {error, 30 issues [{feature,message}]}, POST /api/explain unknown id → 404 {"error":"Prediction not found"}. All shapes match src/lib/client/api.ts types exactly.
- SSR smoke: fresh `bun run dev`, GET / → 200, 27,585-byte HTML, "EduInsight" ×2 (metadata title + wordmark); dev log shows only prisma warmup (engine persisted 137/137 ExperimentRun rows) and 200/400 responses — no compile errors in frontend files. Server stopped afterwards (port 3000 free).
- Final verification: tsc --noEmit clean for src/** (only 4 pre-existing errors outside the app in examples/websocket/* and skills/*), `bun run lint` 0 errors / 1 warning (unused eslint-disable directive in src/lib/ml/engine.ts — backend file, out of scope, pre-existing per Task 2-a log).

Deviations:
- No rewrites beyond the one lint fix: per the echo-unreliability protocol, files that type-checked and SSR'd cleanly were left byte-identical even where Read echoes looked garbled.
- /api/transfer, /api/subgroups, /api/experiments/{oof,hypotheses,stability,ablation} match the on-disk backend routes (spec prose said /api/experiments/transfer; live backend exposes /api/transfer — client aligned to the real, verified contract).
- The meta.data refetch no longer force-resets an existing prediction result (old effect side effect; removal is intentional — a stale-refocus refetch shouldn't wipe the user's estimate).

Stage Summary:
- Frontend complete and verified end-to-end: types compile clean, lint clean (1 out-of-scope pre-existing warning), all 5 hash views + 10 chart components + full data-viz language live against the real engine, every number fetched from verified endpoints (no hardcoded results), evidence footers + honest uncertainty throughout.
- Handed back: single-route app at #/ {landing, overview, experiments, predict, about}; API client types proven against 13 live responses; remaining polish (light-theme QA pass, chart keyboard tooltips) is optional and out of scope.

---
Task ID: 3
Agent: main (orchestrator)
Task: Integration, SSR fix, end-to-end browser verification

Work Log:
- Fixed SSR crash: `src/app/page.tsx` read `window.location.hash` inside a useState initializer (ReferenceError during server render → HTTP 500). Replaced with SSR-safe "landing" default + hash sync on mount.
- Verified all 12 API endpoints live: health (counts 146 runs), overview (math n=395 / both matchedPairs=366), experiments (30 classification runs, S2 logistic prAuc 0.5528 [0.5219, 0.5837]), oof (1185 rows), hypotheses H1-H6, stability, ablation, transfer, subgroups, meta; POST predict → p=0.388, conformalSet [0,1] → honest "uncertain"; 400 + per-field issues on bad payload.
- Agent Browser end-to-end verification (desktop 1440×900 + mobile 390×844):
  - Landing: hero, real KPIs (395 / 32.9% / 10.42 / 9.6%), animated accumulation curve with CI band + evidence footer.
  - Overview: subject switcher, ridgeline KDE (G1/G2/G3), risk-share bars (F 36.1% n=208…), associations lollipop + table with BH-FDR marks.
  - Experiments: Information Ladder stepper, finding-statement hero ("Grades lift PR-AUC from 0.40 to 0.95"), forest plot with CIs + significance dots, reliability diagram (ECE 0.08 badge), subgroup forest (bootstrap CIs, n labels).
  - Predict: full flow — grouped form (sliders/selects/toggles) → gauge 0.90 with conformal band + threshold tick, risk badge, model chips (ECE 0.12, n=297), Waterfall of Evidence (failures +1.267 ▲ … Walc −0.249 ▼, final capsule with interval), copy/download actions, disclaimer card.
  - About: editorial layout with SHA-256 pins, tiers table, limitations.
  - ⌘K command palette works; light/dark theme toggle works; sticky disclaimer footer present; mobile bottom tab bar fixed and visible; no browser console errors or page errors.
- Final gates: `bun run lint` → 0 errors 0 warnings (removed unused eslint-disable in engine.ts); `tsc --noEmit` → clean for src/** (4 pre-existing errors in scaffold examples/skills only); POST /api/predict 11ms (plan §13.6 budget < 1s).

Stage Summary:
- EduInsight AI is complete and browser-verified: single-route Obsidian & Champagne app with five views, a real TypeScript ML engine on the genuine UCI dataset (grouped stratified 5×3 CV, conformal uncertainty, honest XAI), 12 JSON endpoints, seeded SQLite provenance store.
- Honest findings reported by the platform itself: H1 supported; H2 supported (complex models do not significantly beat logistic at S2); H3 not_supported (ridge beats G3=G2 on these folds); H4 inconclusive; H5 not_supported (top-8 Jaccard 0.41 < 0.6); H6 inconclusive.
