# EduInsight AI — Methodology & Evaluation Protocol

**Title:** Beyond Accuracy: A Leakage-Safe, Calibrated and Explanation-Stable Evaluation of Early Student-Risk Prediction  
**Reference:** EduInsight_AI_Implementation_Plan.md Sections 7–10

---

## 1. Information-Tiered Architecture

Predictors are grouped into chronological information tiers:
- **T0 (Enrolment Context):** Demographic, contextual, and family indicators known prior to the course.
- **T1 (History & Support):** Prior failures, school support, extra paid tutoring, higher-education ambition.
- **T2 (In-Term Behavior):** Weekly study time, alcohol consumption, socialization, free time, cumulative absences.
- **T3 (Period 1 Grade):** First exam checkpoint (`G1`).
- **T4 (Period 2 Grade):** Second exam checkpoint (`G2`).

Cumulative Information Sets:
- `S0 = T0`
- `S1 = T0 ∪ T1`
- `S2 = T0 ∪ T1 ∪ T2`
- `S3 = S2 ∪ {G1}`
- `S4 = S2 ∪ {G1, G2}`
- `S2-noabs = S2 \ {absences}` (Temporal sensitivity ablation)

---

## 2. Leakage Guard & Grouped Cross-Validation Protocol

### 2.1 The Cross-Subject Overlap Problem
366 students are present in both `student-mat.csv` and `student-por.csv`. If a model is trained on mathematics and tested on Portuguese (or pooled), random splitting leaks individual student identity across train and test partitions.

### 2.2 Grouped Stratified Partitioning
1. Construct `student_group_id` by hashing the 13 immutable attributes.
2. Employ **StratifiedGroupKFold** cross-validation:
   - Outer evaluation: 5 folds × 3 repetitions (seed = 42).
   - Stratification label: `at_risk` for classification; binned `G3` (5 quantiles) for regression.
   - Grouping: `student_group_id`.
   - **Guarantee:** No student appears in both train and validation partitions within any split.
3. **Leakage Audit Tests:** Automated assertion verification confirms that:
   - `G3` is never present in predictor matrix `X`.
   - `G1` and `G2` are absent from `S0`, `S1`, `S2`.
   - One-hot encoders and z-score standardizers are fitted strictly on training folds and transformed on validation folds.

---

## 3. Evaluation Metrics & Decision-Centric Focus

### 3.1 Classification
- **Primary Metric:** Precision-Recall AUC (PR-AUC). With at-risk prevalence at ~33% (math) and ~15% (por), ROC-AUC artificially inflates perceived performance.
- **Secondary Metrics:** ROC-AUC, Balanced Accuracy, Matthews Correlation Coefficient (MCC), Brier Score, Expected Calibration Error (ECE).
- **Decision-Focused Metrics:** Precision@k and Recall@k for intervention budget caps ($k \in \{5\%, 10\%, 20\%, 30\%\}$).
- **Decision Curve Analysis:** Net benefit across clinical/educational intervention thresholds $p_t$:
  $$\text{Net Benefit} = \frac{\text{TP}}{N} - \frac{\text{FP}}{N} \left(\frac{p_t}{1 - p_t}\right)$$

### 3.2 Regression
- **Primary Metric:** Mean Absolute Error (MAE) on the 0–20 scale.
- **Secondary Metrics:** Root Mean Squared Error (RMSE), Coefficient of Determination ($R^2$), Spearman rank correlation ($\rho$).

---

## 4. Statistical Significance & Hypothesis Testing

1. **Paired Model Differences:**
   Model comparisons are conducted fold-by-fold across identical outer evaluation folds.
2. **Nadeau–Bengio Corrected Resampled t-Test:**
   Standard t-tests underestimate variance due to overlapping training folds in repeated CV. We apply the Nadeau & Bengio (2003) correction:
   $$\sigma^2_{\text{corrected}} = \left(\frac{1}{K} + \frac{n_{\text{test}}}{n_{\text{train}}}\right) S^2_{\text{diff}}$$
   $$t = \frac{\bar{d}}{\sqrt{\sigma^2_{\text{corrected}}}}$$
3. **Family-Wise Error Rate Control:**
   Holm–Bonferroni step-down correction is applied across the family of hypothesis tests.
4. **Confidence Intervals:**
   Empirical 95% bootstrap confidence intervals (1,000 resamples) accompany all reported metric deltas.

---

## 5. Trustworthy Machine Learning Tracks

### 5.1 Conformal Prediction & Honest Uncertainty
- **Split Conformal Prediction (inductive conformal):**
  Using a calibration partition, non-conformity scores are computed to produce coverage guarantees at $1 - \alpha = 0.90$.
- **Quantile Computation:** Vovk quantile formula $\lceil (m + 1)(1 - \alpha) \rceil / m$.
- Output: Conformal prediction set $\{0, 1\}$ (or singletons) and interval bounds $[L, U]$. When an interval spans the threshold of 10, the UI honestly labels the prediction as *"Uncertain"*.

### 5.2 Explainability Stability (XAI)
- Local explanations computed via exact linear contributions and tree-interpreter decompositions.
- Stability evaluated across seeds and model families:
  $$\text{Jaccard}(S_i, S_j) = \frac{|S_i \cap S_j|}{|S_i \cup S_j|}$$
  $$\text{Mean Pairwise Jaccard} = \frac{1}{\binom{M}{2}} \sum_{i < j} \text{Jaccard}(S_i, S_j)$$
  Top-k ranking consistency verified via Kendall's rank correlation $\tau$.

### 5.3 Subgroup Fairness Audit
- Disaggregated performance evaluated by `sex`, `school`, `address`, and `ageBand`.
- Bootstrap 95% confidence intervals (500 iterations) computed for recall, precision, and false-positive rate.
- Subgroups with $n < 30$ are explicitly flagged as *"insufficient sample size"* to avoid spurious conclusions.
