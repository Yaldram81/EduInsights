# EduInsight AI — Model Card

Following the framework of Mitchell et al. (2019), *Model Cards for Model Reporting*, FAT* '19.

---

## 1. Model Details

- **Organization:** EduInsight AI Research Initiative
- **Model Versions:**
  - `logistic@v1.0`: L2-regularized logistic regression via IRLS.
  - `ridge@v1.0`: L2-regularized linear regression via Cholesky decomposition.
  - `tree@v1.0`: Histogram CART decision tree.
  - `forest@v1.0`: Bagged decision forest (25 trees).
- **Model Type:** Explainable statistical and machine learning classifiers/regressors.
- **License:** CC BY 4.0 (matching upstream dataset).
- **Citation:** See `CITATION.cff`.

---

## 2. Intended Use

- **Intended Uses:**
  - Academic research into information-accumulation dynamics in learning analytics.
  - Demonstration of rigorous trustworthy ML: honest baselines, leakage guards, calibration, conformal prediction, and explanation stability.
- **Out-of-Scope / Prohibited Uses:**
  - Automated high-stakes decision-making affecting real student grading, retention, tracking, or scholarship awards.
  - Diagnostic claims about individual students.
  - Deployment in educational institutions without comprehensive local validation, institutional IRB review, and student consent.

---

## 3. Factors & Subgroups

- **Demographic Factors:** Sex (`M`, `F`), home address (`U`, `R`), age band (`≤16`, `17`, `≥18`).
- **Academic Factors:** School (`GP`, `MS`), course subject (`Mathematics`, `Portuguese`).
- **Audit Rule:** Subgroups with $n < 30$ are explicitly tagged with *"insufficient sample size"* to prevent statistical over-interpretation.

---

## 4. Evaluation Data & Metrics

- **Data:** UCI Student Performance Benchmark (395 mathematics, 649 Portuguese).
- **Split:** Repeated Stratified Grouped K-Fold (5 folds × 3 repeats, seed 42) grouped by `student_group_id`.
- **Classification Primary Metric:** PR-AUC.
- **Regression Primary Metric:** MAE.
- **Uncertainty:** 90% split conformal prediction intervals and sets.

---

## 5. Quantitative Results Summary

| Info Set | Task | Best Model | Primary Score (95% CI) | Baseline Comparison |
| :--- | :--- | :--- | :--- | :--- |
| **S0** (Enrolment) | Classification | Logistic | PR-AUC 0.402 [0.364, 0.440] | beats majority (0.329) |
| **S2** (Pre-Exam) | Classification | Logistic | PR-AUC 0.553 [0.522, 0.584] | no complex model beats logistic ($p = 0.58$) |
| **S4** (Post-G2) | Classification | Forest | PR-AUC 0.948 [0.931, 0.965] | dramatic gain over S2 |
| **S4** (Post-G2) | Regression | Ridge | MAE 0.834 [0.771, 0.897] | outperforms G3=G2 heuristic ($1.121$) |

---

## 6. Ethical Considerations & Caveats

- **Correlation vs. Causation:** All model coefficients and SHAP values reflect purely observational associations. Recommending behavioral interventions (e.g., reducing weekend social time) based on model weights without randomized trials is methodologically invalid.
- **Conformal Uncertainty:** Predictions must always display the accompanying conformal set and prediction interval. Predictions spanning the pass/fail mark (10) are marked as **Uncertain**.
