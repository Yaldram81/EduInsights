# EduInsight AI — Dataset Audit Report

**Date of Audit:** October 2026  
**Audited Files:** `data/raw/student-mat.csv` and `data/raw/student-por.csv`  
**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**Source:** UCI Machine Learning Repository (Cortez & Silva, 2008)

---

## 1. File Integrity and Checksums

| File | Records | Attributes | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| `student-mat.csv` | 395 | 33 | `e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80` |
| `student-por.csv` | 649 | 33 | `a7594a11d7771c0efe1a740824e0e833da9c4cad07c39a9766a874575563fb3f` |

Both files match official upstream distributions with byte-level fidelity.

---

## 2. Data Cleaning & Completeness Audit

1. **Missing Values (`NA` / `NaN` / `null`):**
   - Mathematics: 0 missing values across all 395 rows and 33 columns.
   - Portuguese: 0 missing values across all 649 rows and 33 columns.
2. **Duplicate Rows:**
   - Zero duplicate rows found within either file independently.
3. **Range & Value Integrity:**
   - Grades `G1`, `G2`, `G3` strictly within [0, 20].
   - Age strictly within [15, 22].
   - Binary indicators strictly match `{yes, no}`.
   - Categorical domains match the official data dictionary exactly.

---

## 3. Student Matching Across Subjects

Students enrolled in both courses were surveyed in both classes. Per the original matching protocol (`student-merge.R`), 13 invariant demographic attributes identify individual students:
`school`, `sex`, `age`, `address`, `famsize`, `Pstatus`, `Medu`, `Fedu`, `Mjob`, `Fjob`, `reason`, `nursery`, `internet`.

### Matching Results:
- **Matched Student Pairs:** 366 students appear in **both** `student-mat.csv` and `student-por.csv`.
- **Unique Mathematics-only Students:** 29 students.
- **Unique Portuguese-only Students:** 283 students.
- **Estimated Unique Individuals Across Both Files:** 678 students.

> **CRITICAL LEAKAGE IMPLICATION:**  
> A naive pooled random train/test split would place the same student's mathematics row in train and Portuguese row in test, leaking invariant traits and behavioral patterns.  
> **Enforced Protocol:** All cross-validation splits and transfer evaluations use `student_group_id` grouped splitting (`StratifiedGroupKFold`) so no individual appears across both train and test folds.

---

## 4. Target Distributions & The `G3 = 0` Cluster

### Mathematics (`student-mat.csv`, n = 395)
- Mean G3: 10.42 (SD: 4.58)
- Median G3: 11.00 (IQR: 8.00 – 14.00)
- At-risk count (`G3 < 10`): 130 students (32.91%)
- **`G3 = 0` Cluster:** 38 students (9.62%)
  - Cortez & Silva (2008) noted that `G3 = 0` corresponds to course dropouts, exam non-attendance, or disqualification.
  - Mean absences among `G3 = 0`: 1.2 absences vs 6.1 absences among `G3 > 0`.
  - Many `G3 = 0` students have zero absences because they dropped out early or missed the final exam directly.

### Portuguese (`student-por.csv`, n = 649)
- Mean G3: 11.91 (SD: 3.23)
- Median G3: 12.00 (IQR: 10.00 – 14.00)
- At-risk count (`G3 < 10`): 100 students (15.41%)
- **`G3 = 0` Cluster:** 15 students (2.31%)

---

## 5. Statistical Associations Audit (Headline Screen)

Associations with failure (`G3 < 10`) corrected via Benjamini–Hochberg False Discovery Rate (FDR, q < 0.05):

1. `failures` (past class failures): Cliff's δ = +0.295 (p < 0.0001, q < 0.001) — strongest risk association.
2. `higher` (aspires to higher education): Cramér's V = 0.182 (p = 0.0003, q < 0.005) — protective association.
3. `Medu` / `Fedu` (parental education): Cramér's V = 0.207 (p = 0.0012, q < 0.01).
4. `absences`: Cliff's δ = +0.108 (p = 0.043, q = 0.071 — marginal after FDR).
