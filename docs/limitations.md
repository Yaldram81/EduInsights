# EduInsight AI — Limitations & Threats to Validity

Every empirical study operates under constraints. In accordance with the principles of open and trustworthy science, this document enumerates the explicit limitations of the EduInsight AI platform and study design.

---

## 1. Data & Population Limitations

1. **Geographic and Temporal Scope:**
   The dataset was collected during the 2005–2006 academic year across two secondary schools in the Alentejo region of Portugal. Findings reflect that specific curricular system, socioeconomic climate, and grading policy. They cannot be assumed to generalize directly to other countries (such as Pakistan, the US, or the UK) or modern remote/hybrid learning paradigms without fresh local calibration.
2. **Modest Sample Sizes:**
   With $n = 395$ (mathematics) and $n = 649$ (Portuguese), statistical power for fine-grained subgroup evaluations (e.g., intersectional demographic categories or older students $\ge 19$) is limited. Subgroups with $n < 30$ are suppressed or flagged as inconclusive.
3. **Self-Report Measurement Bias:**
   Behavioral attributes (such as `studytime`, `freetime`, `Dalc`, `Walc`) were collected via paper surveys. Social desirability bias and retrospective reporting inaccuracies may introduce noise into these features.

---

## 2. Modeling & Temporal Assumptions

1. **The Absence of Timestamps:**
   The UCI Student Performance dataset does not contain timestamps for survey administration or attendance recording.
   - **Documented Assumption:** Features in Tier 2 (`absences`, `studytime`, alcohol consumption) are assumed to have been observed prior to the assignment of intermediate grades.
   - **Sensitivity Check:** The `S2-noabs` information set drops cumulative `absences` to examine the extent to which early risk prediction depends on full-term attendance accumulation.
2. **The `G3 = 0` Drop-Out Phenomenon:**
   A distinct cluster of students (38 in mathematics, 15 in Portuguese) received a final grade of exactly 0. As documented by Cortez & Silva (2008), this typically indicates examination absence, course abandonment, or disciplinary exclusion rather than a measured academic knowledge score of 0. While models are evaluated on the full distribution, sensitivity runs excluding `G3 = 0` are documented to prevent distorted regression residuals.

---

## 3. Explanations & Policy Implications

1. **Association, Not Causation:**
   Feature importances, linear coefficients, and tree-interpreter waterfalls indicate statistical correlation within this historical dataset. They do **not** imply that manipulating an input feature will cause a student's grade to improve or decline.
2. **Explanation Instability:**
   As revealed in Hypothesis 5 ($H5$), explanation rankings across seeds and model families exhibit a pairwise Jaccard similarity of $\approx 0.41 < 0.60$. Researchers and practitioners must exercise caution when communicating "top drivers" of risk, as rankings fluctuate with cross-validation sampling.
3. **No Substitute for Human Judgment:**
   Because 90% conformal intervals often span 4–6 grade points (sufficient to cross the pass/fail mark of 10), predictive outputs should serve solely as secondary exploratory signals, never as automatic gatekeepers.
