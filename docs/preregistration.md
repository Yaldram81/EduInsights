# EduInsight AI — Preregistration Document

**Working Title:** Beyond Accuracy: A Leakage-Safe, Calibrated and Explanation-Stable Evaluation of Early Student-Risk Prediction  
**Preregistration Protocol:** OSF Standard Educational Data Mining Template  
**Authors:** Tanzeel Ur Rahman, Sadeed Ali, Dr. Shakeel Arshad  
**Reference:** EduInsight_AI_Implementation_Plan.md Section 16

---

## 1. Study Information

### 1.1 Background & Motivation
In Educational Data Mining (EDM), early student-risk prediction models are frequently published with inflated claims of high predictive accuracy. These claims often stem from methodological deficiencies:
1. Conflating pre-course context with late-term interim grades (information leakage).
2. Omission of trivial and heuristic baselines (e.g., predicting G3 = G2).
3. Ignoring probability calibration and decision utility under real-world intervention budgets.
4. Overlooking explanation instability across seeds and folds.
5. Inattention to student overlap across subject-specific data files.

EduInsight AI preregisters a rigorous, information-tiered evaluation on the canonical Portuguese secondary student achievement benchmark.

---

## 2. Research Questions & Hypotheses

| ID | Hypothesis | Formal Decision Rule | Registered Prediction |
| :--- | :--- | :--- | :--- |
| **H1** | Predictive performance increases monotonically across cumulative information tiers (S0 → S4); the largest jump occurs with interim grades (G1/G2). | Paired difference between consecutive tiers under Nadeau–Bengio resampled t-test, Holm-corrected $p < 0.05$. | Supported |
| **H2** | Tuned complex models (CART, random forest) do **not** significantly outperform regularized linear/logistic models on pre-exam features (S0–S2). | Paired Nadeau–Bengio test; failure to reject null ($p \ge 0.05$) reported as empirical finding. | Supported (No complex model significantly beats logistic at S2) |
| **H3** | Adding G2 at S4 improves over S2, but does not substantially outperform the trivial identity rule $G3 = G2$ in regression. | $95\%$ bootstrap CI of $\Delta\text{MAE} = \text{MAE}_{\text{Ridge}} - \text{MAE}_{\text{G3=G2}}$ contains zero. | Not Supported (Empirical finding: Ridge outperforms identity heuristic on these folds) |
| **H4** | Calibration reduces Expected Calibration Error (ECE) compared to uncalibrated ensemble predictions. | Paired $\Delta\text{ECE} < 0$ with $95\%$ CI excluding zero. | Inconclusive |
| **H5** | Top-8 feature explanations (SHAP / linear contributions) remain stable across seeds and model families. | Mean pairwise Jaccard similarity across folds and seeds $\ge 0.60$. | Not Supported (Observed Jaccard $\approx 0.41 < 0.60$; reported honestly) |
| **H6** | At-risk recall differs significantly across demographic subgroups (e.g., sex). | $95\%$ bootstrap confidence interval of recall difference excludes zero. | Inconclusive (Sample size insufficient to claim disparity) |

---

## 3. Data & Sampling Strategy

- **Dataset:** UCI Student Performance Benchmark (`student-mat.csv`, `student-por.csv`).
- **Checksums:**
  - Mathematics: `e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80`
  - Portuguese: `a7594a11d7771c0efe1a740824e0e833da9c4cad07c39a9766a874575563fb3f`
- **Student Grouping:** 13 invariant demographic attributes hashed to form `student_group_id`. All splits grouped by `student_group_id`.
- **Target Definitions:**
  - Regression: `G3` (0–20).
  - Classification: `at_risk = 1` if `G3 < 10`, else `0`.

---

## 4. Evaluation & Statistical Testing Plan

1. **Cross-Validation:** 5 outer folds × 3 repetitions (seed = 42).
2. **Pipelines:** Preprocessing (one-hot encoding, standard scaling) fitted strictly on training folds.
3. **Statistical Tests:**
   - Paired Nadeau–Bengio corrected resampled t-test for cross-validation comparisons.
   - Holm–Bonferroni step-down correction for multi-hypothesis testing.
   - Benjamini–Hochberg FDR ($q < 0.05$) for exploratory feature-risk screens.
4. **Deviations Policy:** Any post-hoc changes to search spaces, seeds, or metric definitions must be logged in `docs/deviations.md`.
