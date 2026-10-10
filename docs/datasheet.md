# EduInsight AI — Datasheet for Dataset

Following the framework proposed by Gebru et al. (2021), *Datasheets for Datasets*, Communications of the ACM.

---

## 1. Motivation

- **For what purpose was the dataset created?**  
  The dataset was collected by Paulo Cortez and Alice Silva (2008) to evaluate educational data mining models predicting secondary school student achievement in core subjects (Mathematics and Portuguese).
- **Who created the dataset?**  
  Paulo Cortez and Alice Silva, University of Minho, Portugal.
- **Who funded the creation of the dataset?**  
  Supported by FCT (Portuguese Foundation for Science and Technology) and the Portuguese Ministry of Education.

---

## 2. Composition

- **What do the instances that comprise the dataset represent?**  
  Each instance represents a student enrolled in a secondary school course (grades 10–12, corresponding to secondary education in Portugal) during the 2005–2006 academic year.
- **How many instances are there in total?**  
  - Mathematics (`student-mat.csv`): 395 instances, 33 attributes.
  - Portuguese language (`student-por.csv`): 649 instances, 33 attributes.
  - Cross-subject overlap: 366 students took both courses and appear in both files.
- **Does the dataset contain all possible instances or is it a sample?**  
  It is a sample drawn from two public secondary schools in the Alentejo region of Portugal:
  - Gabriel Pereira (`GP`)
  - Mousinho da Silveira (`MS`)
- **What data does each instance consist of?**  
  Demographics (sex, age, address, family size, parental status, parental education and jobs), academic context (school, reason, travel time, failures, support, higher education desire), behavior (study time, alcohol consumption, absences, free time), and period grades (`G1`, `G2`, `G3`).
- **Is any information missing?**  
  No. 0% missing values across all columns.
- **Are relationships between instances made explicit?**  
  Overlapping students between `student-mat.csv` and `student-por.csv` are identified through 13 invariant demographic attributes and tagged as `student_group_id`.

---

## 3. Collection Process

- **How was the data associated with each instance acquired?**  
  Academic performance metrics (G1, G2, G3, absences, past failures) were extracted directly from official school administration records. Contextual, social, and behavioral attributes were acquired via paper-based student self-report surveys administered in classrooms.
- **Who was involved in the data collection process?**  
  Secondary school teachers and administrators, supervised by the original authors.
- **Over what timeframe was the data collected?**  
  The 2005–2006 school year.

---

## 4. Preprocessing, Cleaning, and Labeling

- **Was any preprocessing done?**  
  - Numerical grades `G1`, `G2`, `G3` are on a 0–20 integer scale.
  - Past failures are capped at 3 (`failures = 3` indicates 3 or more).
  - Categorical variables are standard strings.
  - EduInsight AI applies zero manual alterations to `data/raw/`. All encoding (one-hot with drop-first, standard scaling) occurs inside isolated cross-validation pipelines.
- **Target Definition:**  
  - Regression: `G3` (scale 0–20).
  - Classification: `at_risk = 1` if `G3 < 10` (the official failing mark in Portugal), `0` otherwise.

---

## 5. Uses

- **Has the dataset been used for tasks previously?**  
  Extensively used in EDM benchmark literature (Cortez & Silva, 2008; hundreds of subsequent learning analytics studies).
- **What tasks should the dataset NOT be used for?**  
  - High-stakes automatic decisions regarding student retention, funding, or streaming.
  - Direct policy decisions in non-Portuguese education systems without local calibration and consent.
  - Conflating observational predictive associations with causal intervention guidance.

---

## 6. Distribution and Maintenance

- **How is the dataset distributed?**  
  Hosted openly at the UCI Machine Learning Repository (DOI: 10.24432/C5GC66).
- **What is the dataset license?**  
  Creative Commons Attribution 4.0 International (CC BY 4.0).
