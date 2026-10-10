# EduInsight AI — Complete Implementation Plan

**Working title:** *Beyond Accuracy: A Leakage-Safe, Calibrated and Explanation-Stable Evaluation of Early Student-Risk Prediction*

**Original title (kept as application name):** EduInsight AI: An Explainable Machine Learning Framework for Academic Performance Analytics and Early Student Risk Prediction

**Domain:** Educational Data Mining · Learning Analytics · Explainable ML · Trustworthy ML evaluation

**Team (as planned):** Tanzeel Ur Rahman (ML, XAI, backend/integration) · Sadeed Ali (data & statistical analysis, visualization) · Dr. Shakeel Arshad (supervisor — list only to the extent he actually supervises/reviews)

**Duration:** 14 weeks · **Goal:** a rigorous, reproducible, preregistered study + open-source repo + preprint + working demo, for the research CV.

---

## Table of contents

1. Critical review of the original plan
2. Refined research design (questions, contributions, hypotheses)
3. Data strategy
4. Feature tiers and data dictionary
5. Targets and label definitions
6. Models
7. Evaluation protocol
8. Statistical analysis track
9. Explainability track
10. Error, fairness and transfer analysis
11. Repository, tooling and engineering standards
12. Code skeletons
13. Application (API, DB, UI)
14. Week-by-week implementation schedule
15. Experiment matrix
16. Preregistration template
17. Paper structure and publication plan
18. Risks and mitigations
19. Integrity checklist
20. Definition of done
21. Immediate next actions

---

## 1. Critical review of the original plan

### Keep
- Two scenarios (without / with G1, G2), explicit leakage rules, baselines, CV, error analysis, SHAP, subgroup analysis, and the "will not do" integrity list.

### Fix

| # | Problem | Why it matters | Fix |
|---|---------|----------------|-----|
| 1 | "Early vs progress-aware" is not novel | Cortez & Silva (2008), the dataset's source paper, already compared setups with and without prior grades | Make the contribution *rigorous evaluation* (calibration, stability, transfer, uncertainty), not the comparison itself |
| 2 | "Early" is not truly early | No timestamps; `absences`, `studytime` describe the same period that produced G1–G3 | Use **information tiers** (T0–T4) and state the assumption; run a sensitivity analysis without `absences` |
| 3 | Math and Portuguese files overlap (~380 students appear in both) | Random split can place the same student in train and test | Deduplicate/match students, build `student_group_id`, use **grouped** splits |
| 4 | `G3 = 0` cluster | Dropouts/no-shows distort regression, R² and SHAP | Report results with and without these rows; analyze separately |
| 5 | Strong trivial baseline missing | With G2 available, "G3 = G2" is hard to beat | Add it as a mandatory baseline |
| 6 | Small n (≈395 / ≈649) | Single split is noisy | Repeated nested CV, bootstrap CIs, corrected significance tests |
| 7 | One dataset only | Claims cannot generalize | Add external validation dataset(s) |
| 8 | App is over-scoped (8 pages, EAV table) | Weeks of work, little research value | 4 pages, simplified schema, time-boxed to ~3 weeks |
| 9 | Fixed threshold not justified beyond "defensible" | Label definition drives all results | Use pass mark G3 < 10 + sensitivity analysis |

---

## 2. Refined research design

### 2.1 Research questions

| ID | Question |
|----|----------|
| RQ1 | How does predictive performance change as information accumulates (T0 background → T1 history → T2 behavior → +G1 → +G2)? |
| RQ2 | Do complex models significantly outperform strong simple baselines (mean, "G3 = G2", regularized linear/logistic) under rigorous evaluation? |
| RQ3 | Are predicted risk probabilities calibrated, and how useful are they under a limited intervention budget (top-k flagging)? |
| RQ4 | How stable are SHAP explanations across seeds, folds and model families, and do they agree with an inherently interpretable model (EBM)? |
| RQ5 | Do error rates differ across subgroups, and do findings transfer across subject (math ↔ Portuguese) and dataset? |

### 2.2 Contributions (claim only what you demonstrate)

1. Information-tiered evaluation (accumulation curve).
2. Leakage-audited, preregistered, reproducible benchmark (grouped repeated nested CV; corrected tests).
3. Decision-focused evaluation: calibration, precision/recall@k, decision-curve net benefit.
4. Explanation-stability analysis.
5. Conformal prediction intervals / sets with empirical coverage.
6. Cross-subject and external-dataset transfer.
7. Open code, data card, model card, DOI.

### 2.3 Hypotheses (preregister decision rules)

| ID | Hypothesis | Decision rule (example) |
|----|------------|-------------------------|
| H1 | Performance increases with information tier; the largest jump occurs at G1/G2 | Paired difference between consecutive tiers, Holm-corrected p < 0.05, and effect size reported |
| H2 | Tuned ensembles do **not** significantly beat regularized linear/logistic models on T0–T2 | Corrected test; failure to reject is reported as such |
| H3 | Adding G2 helps over T0–T2 but adds little over the "G3 = G2" rule (regression) | CI of ΔMAE vs rule includes/excludes 0 |
| H4 | Calibration reduces ECE vs uncalibrated ensembles | Paired ΔECE with CI |
| H5 | SHAP top-5 overlap across seeds/models is high | Mean Jaccard ≥ 0.6 (set before running) |
| H6 | At-risk recall differs across at least one subgroup | Bootstrap CIs of recall difference exclude 0 (with min group size) |

Hypotheses are not predetermined results. Null results are reported as findings.

---

## 3. Data strategy

| Dataset | Role | Notes (verify details on the source page before citing) |
|---------|------|------------------------------------------------------------|
| UCI Student Performance (`student-mat.csv`, `student-por.csv`) | Primary | Two Portuguese secondary schools; 33 attributes; CC BY 4.0 |
| UCI "Predict Students' Dropout and Academic Success" | External validation 1 | Portuguese higher-education students, different level and scale |
| OULAD (Open University Learning Analytics Dataset) | Optional external / temporal | VLE clickstream; allows true week-by-week early warning |

**Rules**
- Never fabricate or simulate "Pakistani university" data. A local dataset requires written institutional permission, consent and anonymization, and is a separate study.
- Keep `raw/` immutable; all cleaning is code, not manual edits.
- Scope every claim: "Portuguese secondary-school students (n = …)".
- Record dataset versions, download dates, checksums (SHA-256) in `docs/datasheet.md`.

### 3.1 Student matching across subject files

Match students across the two files using the attributes: `school, sex, age, address, famsize, Pstatus, Medu, Fedu, Mjob, Fjob, reason, nursery, internet`. Assign:

- `student_group_id` — shared by a student appearing in both files.
- `subject` — `math` or `por`.

Audit outputs (save to `docs/audit_report.md`): row counts, duplicates, matched students, ambiguous matches, missingness, value-range checks, count of `G3 = 0`, the distribution of `absences` among `G3 = 0`.

---

## 4. Feature tiers and data dictionary

Tiers reflect **plausible availability order**, which is a documented assumption (the dataset has no timestamps). Finalize jointly with Sadeed.

| Tier | Group | Columns |
|------|-------|---------|
| T0 | Background (demographic, family, school context) | `sex, age, address, famsize, Pstatus, school, reason, traveltime, Medu, Fedu, Mjob, Fjob, guardian` |
| T1 | History and support | `failures, nursery, higher, schoolsup, famsup, paid, activities` |
| T2 | Behavior and attendance | `studytime, freetime, goout, Dalc, Walc, health, romantic, internet, famrel, absences` |
| T3 | First period grade | `G1` |
| T4 | Second period grade | `G2` |
| Target | Final grade | `G3` (never a predictor) |

**Information sets used**

| Set | Contents |
|-----|----------|
| S0 | T0 |
| S1 | T0 + T1 |
| S2 | T0 + T1 + T2 |
| S3 | S2 + G1 |
| S4 | S2 + G1 + G2 |
| S2-noabs | S2 without `absences` (sensitivity) |

**Feature groups for ablation:** Demographic, Family/Social, Academic history, Behavior, Attendance, Assessment.

**Data dictionary template** (`docs/data_dictionary.md`):

| Column | Description | Type | Range / levels | Tier | Group | Notes / concerns |
|--------|-------------|------|----------------|------|-------|------------------|
| `failures` | Past class failures | ordinal | 0–3 | T1 | Academic history | Capped at 3 (4 means "≥3") — check |
| … | … | … | … | … | … | … |

---

## 5. Targets and label definitions

- **Regression target:** `G3` (0–20). Evaluate on all rows and on `G3 > 0` only.
- **Classification target:** `at_risk = (G3 < 10)`, 10/20 being the pass mark. Document the reason in `docs/methodology.md`.
- **Threshold sensitivity:** 9, 11, 12, plus a bottom-quartile definition.
- **Optional ordinal target:** fail (<10) / pass (10–13) / good (≥14).
- **Imbalance:** stratify folds; compare class weights vs none; no resampling outside CV folds.

---

## 6. Models

| Family | Regression | Classification |
|--------|------------|----------------|
| Trivial | Mean/median; **G3 = G2** rule (S4 only); "G3 = G1" rule (S3) | Majority class; **rule** (failures ≥ 1 or absences above median) |
| Linear | Ridge, ElasticNet | Logistic (L1, L2) |
| Interpretable | EBM (InterpretML), shallow tree | EBM, shallow tree |
| Ensembles | Random Forest, ExtraTrees, HistGradientBoosting, XGBoost/LightGBM, CatBoost | same |
| Optional | TabPFN | TabPFN |

Tuning budget (trials, folds, search space size) must be **identical per model family**, specified in `configs/models.yaml`.

---

## 7. Evaluation protocol

1. **Preregister** hypotheses, sets, metrics, tests, thresholds on OSF *before* final runs.
2. **Lockbox:** 20% grouped, stratified hold-out, touched once at the end.
3. **Development set (80%):** repeated stratified grouped **nested CV** — outer 5 folds × 5 repeats, inner 3–5 folds for tuning.
4. **Pipelines:** all preprocessing inside `Pipeline`/`ColumnTransformer`; categorical encoding fitted on train folds only.
5. **Model comparison:** paired differences across identical outer folds; Nadeau–Bengio corrected resampled t-test or Wilcoxon signed-rank; Holm correction across comparisons; effect sizes and bootstrap 95% CIs.
6. **Metrics**

| Task | Primary | Secondary |
|------|---------|-----------|
| Regression | MAE | RMSE, R², Spearman ρ |
| Classification | PR-AUC | ROC-AUC, recall at fixed precision, F2, balanced accuracy, MCC, Brier, ECE |
| Decision-focused | Recall@top-k (5/10/20%) | Precision@k, decision-curve net benefit |

7. **Calibration:** none vs Platt vs isotonic, fitted inside training folds only; reliability diagrams, ECE, Brier.
8. **Uncertainty:** split-conformal prediction intervals for G3 and conformal sets for risk; report empirical coverage vs nominal (e.g., 90%).
9. **Reproducibility:** global seed list in config; every run logged (MLflow) with git commit hash, config hash, data hash.

---

## 8. Statistical analysis track (Sadeed's lead)

| Step | Deliverable |
|------|-------------|
| Data audit | Missingness, duplicates, ranges, outliers → `audit_report.md` |
| Univariate | Distributions of G1–G3, absences, study time; skewness and zero inflation |
| Bivariate | Spearman/Pearson (depending on variable type), group comparisons (t/Mann–Whitney, ANOVA/Kruskal–Wallis), chi-square for categorical vs risk |
| Effect sizes | Cliff's delta, Cramér's V, η² (with bootstrap CIs) |
| Multiple testing | Benjamini–Hochberg FDR across the test family |
| Multivariable model | OLS with robust SE (G3) and logistic regression (risk), reporting coefficients with CIs |
| Assumption checks | Normality, homoscedasticity, multicollinearity (VIF) |
| Reporting | Statistical appendix + reproducible notebook; consistent figure style |

Language rule: "associated with", never "causes".

---

## 9. Explainability track

- SHAP (TreeExplainer) global and local for the best tree model; coefficients / EBM shape functions for the glass-box models.
- **Stability protocol:**
  1. Train the same model across ≥ 20 seeds/folds.
  2. Compute global importance (mean |SHAP|).
  3. Compare rankings: top-k Jaccard (k = 5, 10), Kendall's τ.
  4. Repeat across model families (RF vs GB vs EBM vs logistic).
- Compare SHAP vs permutation importance vs EBM importance; report disagreements.
- Correlated features: report grouped importance (by feature group) as well as per feature.
- Local explanations: waterfall plots for selected correct/incorrect cases (e.g., one true positive, one false negative).
- UI wording: "Factors associated with this prediction".

---

## 10. Error, fairness and transfer analysis

### 10.1 Error analysis
- Largest residuals; characterize false positives/negatives; examine the `G3 = 0` cluster separately.
- Error vs feature ranges (binned residual plots).

### 10.2 Subgroup analysis
- Groups: sex, school, address, age band, parental education (only where n ≥ 30 per group).
- Metrics per group: recall, FPR, FNR, precision, calibration; **bootstrap CIs**.
- Compare a model with demographic features vs without them; report trade-offs.
- State: analysis of model behavior, not a basis for decisions on individual students.

### 10.3 Transfer
- Train math → test Portuguese and vice versa (grouped to avoid overlapping students).
- Train UCI Student Performance → apply protocol to the dropout dataset (feature mapping documented; evaluate the *protocol's* conclusions, not model transfer, when features differ).

---

## 11. Repository, tooling and engineering standards

```text
eduinsight-ai/
├── README.md
├── LICENSE
├── CITATION.cff
├── pyproject.toml
├── Makefile
├── .pre-commit-config.yaml
├── .github/workflows/ci.yml
├── configs/
│   ├── data.yaml
│   ├── tiers.yaml
│   ├── models.yaml
│   ├── cv.yaml
│   └── experiments/          # e01.yaml ... e12.yaml
├── data/
│   ├── raw/                  # immutable (download script, checksums)
│   ├── interim/
│   └── processed/
├── docs/
│   ├── datasheet.md
│   ├── data_dictionary.md
│   ├── audit_report.md
│   ├── methodology.md
│   ├── preregistration.md
│   ├── model_card.md
│   └── limitations.md
├── notebooks/
│   ├── 01_audit.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_statistics.ipynb
│   ├── 04_baselines.ipynb
│   ├── 05_results_figures.ipynb
│   └── 06_explainability.ipynb
├── src/eduinsight/
│   ├── data/                 # loaders, matching, group ids, validation (pandera)
│   ├── features/             # tier registry, transformers
│   ├── models/               # model registry, baselines
│   ├── evaluation/           # nested CV, metrics, stats tests, calibration, conformal
│   ├── explain/              # SHAP, stability, EBM
│   ├── fairness/             # subgroup metrics, bootstrap
│   └── cli.py                # eduinsight run E3
├── experiments/              # results (parquet/csv), figures, MLflow runs
├── services/api/             # FastAPI service
├── apps/web/                 # Next.js dashboard
├── tests/
└── paper/                    # LaTeX/Markdown, auto-generated tables and figures
```

**Tooling**
- Python 3.11+, `uv` or `poetry`; scikit-learn, pandas, numpy, scipy, statsmodels, xgboost/lightgbm/catboost, shap, interpret, mapie, mlflow, pandera, pytest, ruff, mypy.
- Data versioning: DVC, or a download script plus SHA-256 checksums.
- CI (GitHub Actions): lint, type check, unit tests, tiny smoke run of the pipeline.
- Docker for API and ML environment; `docker-compose` for API + Postgres + web.

**Mandatory tests**
- `G3` never present in feature matrix `X`.
- S0–S2 never contain `G1`/`G2`; S3 contains `G1` only; S4 contains both.
- Preprocessors are fitted on training folds only (mock/spy test).
- Grouped splits: no `student_group_id` appears in both train and test.
- Metric functions match known values on toy examples.
- Determinism: same seed → same result.

---

## 12. Code skeletons

### 12.1 Tier registry (`configs/tiers.yaml`)

```yaml
target: G3
groups:
  T0: [sex, age, address, famsize, Pstatus, school, reason, traveltime, Medu, Fedu, Mjob, Fjob, guardian]
  T1: [failures, nursery, higher, schoolsup, famsup, paid, activities]
  T2: [studytime, freetime, goout, Dalc, Walc, health, romantic, internet, famrel, absences]
  T3: [G1]
  T4: [G2]
sets:
  S0: [T0]
  S1: [T0, T1]
  S2: [T0, T1, T2]
  S3: [T0, T1, T2, T3]
  S4: [T0, T1, T2, T3, T4]
```

### 12.2 Feature selection with leakage guard

```python
import yaml
import pandas as pd

def get_features(df: pd.DataFrame, set_name: str, cfg_path="configs/tiers.yaml"):
    cfg = yaml.safe_load(open(cfg_path))
    cols = [c for t in cfg["sets"][set_name] for c in cfg["groups"][t]]
    assert cfg["target"] not in cols, "Target leaked into features"
    if set_name in {"S0", "S1", "S2"}:
        assert not {"G1", "G2"} & set(cols), "Grades leaked into early set"
    return df[cols], df[cfg["target"]]
```

### 12.3 Pipeline builder

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

def build_pipeline(model, X):
    cat = X.select_dtypes(include=["object", "category"]).columns.tolist()
    num = [c for c in X.columns if c not in cat]
    pre = ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")),
                          ("sc", StandardScaler())]), num),
        ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")),
                          ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat),
    ])
    return Pipeline([("pre", pre), ("model", model)])
```

### 12.4 Repeated grouped nested CV

```python
import numpy as np
from sklearn.model_selection import StratifiedGroupKFold, GridSearchCV

def nested_cv(pipe, param_grid, X, y, groups, strat, scorer, n_repeats=5, seed=42):
    rows = []
    for rep in range(n_repeats):
        outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed + rep)
        for fold, (tr, te) in enumerate(outer.split(X, strat, groups)):
            inner = StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=seed + rep)
            inner_splits = list(inner.split(X.iloc[tr], strat.iloc[tr], groups.iloc[tr]))
            gs = GridSearchCV(pipe, param_grid, cv=inner_splits, scoring=scorer, n_jobs=-1)
            gs.fit(X.iloc[tr], y.iloc[tr])
            rows.append({"rep": rep, "fold": fold,
                         "best_params": gs.best_params_,
                         "score": gs.score(X.iloc[te], y.iloc[te]),
                         "test_idx": te})
    return rows
```

`strat` = the stratification label (risk class for classification; binned G3 for regression).

### 12.5 Corrected resampled t-test (Nadeau–Bengio)

```python
from scipy import stats

def corrected_resampled_ttest(diffs, n_train, n_test):
    """diffs: per-split score differences between two models (length k)."""
    k = len(diffs)
    mean = np.mean(diffs)
    var = np.var(diffs, ddof=1)
    corrected_var = (1 / k + n_test / n_train) * var
    t = mean / np.sqrt(corrected_var)
    p = 2 * stats.t.sf(abs(t), df=k - 1)
    return t, p
```

### 12.6 Calibration metrics

```python
from sklearn.metrics import brier_score_loss

def expected_calibration_error(y_true, y_prob, n_bins=10):
    bins = np.linspace(0, 1, n_bins + 1)
    ids = np.digitize(y_prob, bins[1:-1])
    ece = 0.0
    for b in range(n_bins):
        m = ids == b
        if m.any():
            ece += m.mean() * abs(y_true[m].mean() - y_prob[m].mean())
    return ece
```

### 12.7 Precision/recall at top-k

```python
def topk_metrics(y_true, y_prob, frac):
    k = max(1, int(np.ceil(frac * len(y_true))))
    idx = np.argsort(-y_prob)[:k]
    tp = y_true[idx].sum()
    return {"precision@k": tp / k, "recall@k": tp / y_true.sum()}
```

### 12.8 SHAP stability

```python
import shap
from itertools import combinations

def top_k_features(model, X, k=5):
    sv = shap.TreeExplainer(model).shap_values(X)
    imp = np.abs(sv).mean(axis=0)
    return set(np.array(X.columns)[np.argsort(-imp)[:k]])

def mean_jaccard(sets):
    js = [len(a & b) / len(a | b) for a, b in combinations(sets, 2)]
    return float(np.mean(js))
```

When using one-hot encoding, aggregate SHAP values back to the original features before ranking.

### 12.9 Conformal intervals (MAPIE sketch)

```python
from mapie.regression import MapieRegressor   # check the installed MAPIE version's API
mapie = MapieRegressor(estimator=pipe, method="plus", cv=5)
mapie.fit(X_train, y_train)
y_pred, y_pis = mapie.predict(X_test, alpha=0.1)   # 90% intervals
coverage = ((y_test >= y_pis[:, 0, 0]) & (y_test <= y_pis[:, 1, 0])).mean()
```

### 12.10 Bootstrap CI

```python
def bootstrap_ci(metric_fn, y, p, n=2000, seed=0, alpha=0.05):
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        vals.append(metric_fn(y[i], p[i]))
    return np.percentile(vals, [100 * alpha / 2, 100 * (1 - alpha / 2)])
```

---

## 13. Application (time-boxed to ~3 weeks)

### 13.1 Scope
Four pages only:

| Page | Purpose |
|------|---------|
| `/overview` | EDA summaries, key analytics (from Sadeed's outputs) |
| `/experiments` | Accumulation curve, model comparison with CIs, calibration, ablation |
| `/predict` | Choose information set; enter features; show risk probability, conformal set, local SHAP, disclaimer |
| `/about` | Model card, data scope, limitations, intended use |

### 13.2 Architecture

```text
Next.js (apps/web)  ──REST/JSON──▶  FastAPI (services/api)
                                       ├── loads versioned joblib pipelines
                                       ├── SHAP explanation service
                                       └── PostgreSQL (experiment metadata, logged predictions)
```

### 13.3 API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/models` | Available models, sets, versions, metrics |
| GET | `/experiments` | Experiment list with summary metrics |
| GET | `/experiments/{id}` | Detailed results (fold metrics, CIs) |
| POST | `/predict` | Body: `set`, `features` → probability, label, conformal set |
| POST | `/explain` | Body: `set`, `features` → per-feature SHAP contributions |
| GET | `/subgroups` | Subgroup metrics for the selected model |

Use Pydantic schemas with strict validation of ranges and levels (from the data dictionary). Version the model artifacts (`model_name@version`) and log artifact hash.

### 13.4 Simplified database schema

```sql
datasets(id, name, source_url, version, license, sha256, created_at)

models(id, name, task, info_set, version, artifact_path, artifact_sha256,
       dataset_id → datasets.id, created_at)

experiments(id, code, model_id → models.id, info_set, target,
            params JSONB, metrics JSONB, git_commit, created_at)

predictions(id, model_id → models.id, input_features JSONB,
            prediction DOUBLE PRECISION, probability DOUBLE PRECISION,
            conformal_set JSONB, created_at)

explanations(id, prediction_id → predictions.id, feature TEXT,
             contribution DOUBLE PRECISION, direction TEXT)
```

No `users` table unless authentication is added. Use Alembic for migrations (SQLAlchemy in FastAPI).

### 13.5 UI wording and guardrails
- "Factors associated with this prediction", never "caused by".
- Display uncertainty (probability + conformal set), not a bare label.
- Banner: "Research prototype trained on Portuguese secondary-school data; not for decisions about real students."
- No PII stored; logged predictions contain only the feature payload.

### 13.6 App acceptance criteria
- `/predict` returns in < 1 s for a single request.
- API tests cover validation errors, each info set, and the explain endpoint.
- The container stack starts with a single `docker compose up`.

---

## 14. Week-by-week implementation schedule

### Week 1 — Foundation and audit
- [ ] Create repo, environment, CI, pre-commit, Makefile.
- [ ] Download datasets; store SHA-256 checksums; write the download script.
- [ ] Implement loaders, validation (pandera), student matching and `student_group_id`.
- [ ] Produce `audit_report.md` (shapes, missingness, duplicates, matches, `G3 = 0` stats).
- [ ] Draft literature search strategy (databases, keywords, inclusion/exclusion).
- **Done when:** audit report committed; tests for loaders pass.

### Week 2 — Data dictionary, EDA, literature
- [ ] Complete `data_dictionary.md` with tiers and groups (agree with Sadeed).
- [ ] EDA notebook: distributions, correlations, missingness, outliers.
- [ ] Literature matrix (30–40 papers): task, dataset, features, methods, metrics, split protocol, leakage handling, limitations.
- **Done when:** tier/group assignments frozen in `configs/tiers.yaml`.

### Week 3 — Statistical analysis and preregistration
- [ ] Statistical tests, effect sizes, FDR correction, multivariable models (Sadeed lead).
- [ ] Write `preregistration.md` (Section 16) and post to OSF with timestamp.
- [ ] Define lockbox split; save indices; do not inspect lockbox data.
- **Done when:** preregistration public/timestamped; lockbox indices committed.

### Week 4 — Baselines and evaluation framework
- [ ] Trivial and rule baselines.
- [ ] Pipeline builder, nested CV, metrics, corrected tests, bootstrap CIs.
- [ ] Leakage and determinism tests.
- **Done when:** baselines reproduce identical numbers across runs; tests green.

### Week 5 — Tiered experiments (E1–E4)
- [ ] Run S0–S4 with linear + ensemble models for both targets.
- [ ] Produce the accumulation curve with CIs.
- [ ] Add "G3 = G2" and "G3 = G1" comparisons.
- **Done when:** results saved in `experiments/` with logged configs.

### Week 6 — Model comparison and ablation (E5–E6)
- [ ] Full model zoo under equal tuning budgets.
- [ ] Corrected tests with Holm adjustment; results tables.
- [ ] Group drop/only ablation; `absences` sensitivity.
- **Done when:** H1–H3 evaluated against preregistered rules.

### Week 7 — Calibration, decision metrics, uncertainty (E7–E8)
- [ ] Calibration comparison; ECE/Brier; reliability plots.
- [ ] Precision/recall@k; decision-curve analysis.
- [ ] Conformal intervals/sets with coverage checks.
- **Done when:** H4 evaluated; coverage figures produced.

### Week 8 — Explainability (E9)
- [ ] SHAP global/local; EBM; permutation importance.
- [ ] Stability study across seeds/folds/models.
- **Done when:** H5 evaluated; explanation figures exported.

### Week 9 — Error, fairness, transfer (E10–E12)
- [ ] Error analysis; subgroup metrics with bootstrap CIs.
- [ ] Math ↔ Portuguese transfer; external dataset runs.
- **Done when:** H6 evaluated; limitations list updated.

### Week 10 — Lockbox and freeze
- [ ] Final model per set chosen **from development results only**.
- [ ] Evaluate once on the lockbox; record results.
- [ ] Freeze experiments; tag release `v1.0-results`.
- **Done when:** results tagged; no later changes to experiment code affecting numbers.

### Weeks 11–12 — Application
- [ ] FastAPI service, model loading, `/predict`, `/explain`, metadata endpoints.
- [ ] PostgreSQL + Alembic; Docker Compose.
- [ ] Next.js pages (overview, experiments, predict, about).
- [ ] API and UI smoke tests; screenshots and short demo video.

### Week 13 — Paper
- [ ] Draft all sections; generate tables/figures from result files (no manual copying).
- [ ] Write limitations and ethics sections.
- [ ] Complete the model card and datasheet.

### Week 14 — Review and release
- [ ] Supervisor review; revise.
- [ ] README polish (quick start, reproduce-results command, architecture figure).
- [ ] Zenodo DOI; arXiv preprint (arrange an endorser early if required); submit to a suitable venue.

---

## 15. Experiment matrix

| ID | Info set(s) | Target | Models | Purpose | Hypothesis |
|----|-------------|--------|--------|---------|------------|
| E1 | S0, S1, S2 | G3 | Baselines, Ridge, ensembles | Accumulation curve (regression) | H1 |
| E2 | S0, S1, S2 | Risk | Baselines, Logistic, ensembles | Accumulation curve (classification) | H1 |
| E3 | S3, S4 | G3 | + "G3 = G2" and "G3 = G1" rules | Progress-aware regression | H1, H3 |
| E4 | S3, S4 | Risk | Baselines, Logistic, ensembles | Progress-aware classification | H1, H3 |
| E5 | S2-noabs | G3 / Risk | Best 3 models | Sensitivity to temporal assumption | — |
| E6 | Group drop/only | G3 / Risk | Best 3 models | Ablation | — |
| E7 | Best sets | Risk | Best models ± calibration | Calibration, top-k, decision curves | H4 |
| E8 | Best sets | G3 / Risk | Best models | Conformal coverage | — |
| E9 | Best sets | Risk | Best tree model, EBM, logistic | Explanation stability and agreement | H5 |
| E10 | Best sets | G3 / Risk | Best models | Error and subgroup analysis | H6 |
| E11 | S2, S4 | Risk | Best models | Math ↔ Portuguese transfer | — |
| E12 | Mapped features | Risk-analog | Best models | External validation of the protocol | — |

All experiments are also run on the `G3 > 0` subset (reported as a robustness check).

---

## 16. Preregistration template (`docs/preregistration.md`)

1. **Title and authors.**
2. **Background and motivation** (3–5 sentences).
3. **Research questions and hypotheses** (Section 2) with decision rules.
4. **Data:** sources, versions, checksums, inclusion/exclusion, student matching rule, lockbox size and seed.
5. **Variables:** target definitions, thresholds, information sets, feature groups.
6. **Models:** list, hyperparameter search spaces, tuning budget.
7. **Evaluation:** CV design, metrics, calibration methods, conformal settings.
8. **Statistical analysis plan:** tests, corrections, effect sizes, CI methods.
9. **Explainability and fairness plan:** stability metrics, thresholds, subgroup rules (min n).
10. **Deviations policy:** any change after registration is logged in `docs/deviations.md` with reason and date.
11. **Exploratory analyses:** explicitly labeled as exploratory.

---

## 17. Paper structure and publication plan

### 17.1 Conference/journal paper (8–10 pages)

1. Abstract
2. Introduction (problem, gap, contributions)
3. Related work (EDM, student performance prediction, leakage in EDM, calibration, XAI stability, fairness)
4. Data and information tiers
5. Methodology (protocol, models, metrics, statistics)
6. Results (accumulation curve, comparisons, calibration/top-k, uncertainty, explanations, subgroups, transfer)
7. Discussion (interpretation, practical implications, what ML did and did not add)
8. Limitations and ethics
9. Conclusion and future work
10. Reproducibility statement (repo, DOI, seeds, preregistration link)

### 17.2 Extended technical report / thesis chapter
Expand with full statistical appendix, additional ablations, system design, API documentation.

### 17.3 Release and venue plan

| Step | Action |
|------|--------|
| 1 | OSF preregistration (Week 3) |
| 2 | GitHub public repo with CI (from Week 1) |
| 3 | Zenodo DOI at release (Week 14) |
| 4 | arXiv preprint (Week 14; arrange an endorser early) |
| 5 | Submit to an EDM/learning-analytics workshop or conference, or a suitable regional/IEEE venue; treat top journals as a stretch target |
| 6 | Add demo video and hosted dashboard to the README |

---

## 18. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Null/boring results | Medium | Medium | Framed as rigorous evaluation; null results are findings |
| Small-sample instability | High | Medium | Repeated nested CV, CIs, external dataset |
| Scope creep (app) | High | High | Hard feature freeze at Week 10; app max 3 weeks |
| Benchmark overfitting | Medium | High | Lockbox evaluated once; preregistration |
| Leakage mistakes | Medium | High | Unit tests, grouped splits, code review |
| Team availability / unclear roles | Medium | Medium | Written role split; weekly 30-min sync; shared task board |
| Supervisor availability | Medium | Medium | Send protocol in Week 3 and results in Week 10 for feedback |
| Library/API changes (MAPIE, SHAP) | Low | Low | Pin versions in lockfile |
| Overclaiming | Medium | High | Claims checklist (Section 19) reviewed before submission |

---

## 19. Integrity checklist

- [ ] No fabricated data or results; all numbers traceable to logged runs.
- [ ] No test/lockbox information used in preprocessing, tuning, or model choice.
- [ ] `G3` never used as a predictor; early sets exclude `G1`/`G2`.
- [ ] Claims scoped to the dataset population; no generalization to Pakistani universities.
- [ ] Correlation vs causation language reviewed.
- [ ] Multiple-testing correction applied and reported.
- [ ] Authorship and acknowledgements accurately describe each person's actual contribution, including the supervisor's.
- [ ] Preregistration deviations disclosed.
- [ ] Dataset licenses and citations included (UCI dataset: cite Cortez & Silva, 2008, and the repository).
- [ ] Ethical statement: model is for research, not for decisions about real students.

---

## 20. Definition of done

- [ ] Preregistration published and timestamped.
- [ ] Public repo: one command reproduces main tables/figures (`make reproduce`).
- [ ] All tests and CI passing; code linted and typed.
- [ ] Results for E1–E12 with CIs and corrected tests.
- [ ] Lockbox evaluated once and reported.
- [ ] Model card, datasheet, limitations documented.
- [ ] Working demo (API + dashboard) via Docker Compose.
- [ ] Paper draft reviewed by the supervisor; preprint and DOI released.
- [ ] README with architecture figure, results summary, demo video, citation file.

---

## 21. Immediate next actions (this week)

1. Create the repo and CI skeleton.
2. Download both UCI files, record checksums, run the audit (shapes, missingness, duplicates, matched students, `G3 = 0` counts, `absences` among `G3 = 0`).
3. Draft the data dictionary and tier assignments; review with Sadeed.
4. Write a one-page protocol summary and share it with Dr. Shakeel Arshad for early feedback.
5. Start the literature matrix.

---

*Note: dataset sizes, license terms and library APIs mentioned above should be re-verified against the official sources and installed versions when you start, since details can change.*
