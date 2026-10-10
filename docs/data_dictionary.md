# EduInsight AI — Data Dictionary

This document details all 33 attributes in the UCI Student Performance dataset (`student-mat.csv` and `student-por.csv`), their information tiers (T0–T4), feature groups, data types, permissible values, and potential modeling caveats.

---

## 1. Target Variables

| Attribute | Description | Type | Range / Domain | Role | Notes / Concerns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `G3` | Final course grade | Continuous / Integer | 0 – 20 | **Target (Never a predictor)** | Official Portuguese 20-point grading scale. Evaluated on all rows and `G3 > 0` subset. |
| `at_risk` | Academic risk label | Binary | `{0: pass, 1: at-risk}` | **Classification Target** | Defined as `G3 < 10` (the official failing threshold in Portuguese secondary education). |

---

## 2. Information Tiers (Predictors)

Features are partitioned into tiers reflecting their plausible chronological availability.

### Tier 0: Background & Enrolment Context
Information available at enrollment before coursework or student behavior is observed.

| Attribute | Description | Type | Domain / Levels | Group | Notes / Concerns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `school` | Student's school | Categorical | `GP` (Gabriel Pereira), `MS` (Mousinho da Silveira) | Context | Secondary schools in Alentejo, Portugal |
| `sex` | Student's sex | Categorical | `F` (Female), `M` (Male) | Demographic | Protected attribute (subgroup audit) |
| `age` | Student's age | Numeric | 15 – 22 | Demographic | Ages > 18 indicate repetition or delayed entry |
| `address` | Home address type | Categorical | `U` (Urban), `R` (Rural) | Demographic | Socioeconomic / infrastructure proxy |
| `famsize` | Family size | Categorical | `LE3` (≤ 3), `GT3` (> 3) | Family | Household structure |
| `Pstatus` | Parent cohabitation status | Categorical | `T` (Living together), `A` (Apart) | Family | Family environment stability |
| `Medu` | Mother's education level | Ordinal | 0: none, 1: primary (4th grade), 2: 5th-9th, 3: secondary, 4: higher | Family | Standard ISCED-analog proxy |
| `Fedu` | Father's education level | Ordinal | 0: none, 1: primary (4th grade), 2: 5th-9th, 3: secondary, 4: higher | Family | Standard ISCED-analog proxy |
| `Mjob` | Mother's job | Categorical | `teacher`, `health`, `services`, `at_home`, `other` | Family | Occupational categorization |
| `Fjob` | Father's job | Categorical | `teacher`, `health`, `services`, `at_home`, `other` | Family | Occupational categorization |
| `reason` | Reason for school choice | Categorical | `home` (close to home), `reputation`, `course`, `other` | Context | Institutional selection motive |
| `guardian` | Student's legal guardian | Categorical | `mother`, `father`, `other` | Family | Primary caregiver |
| `traveltime` | Home to school travel time | Ordinal | 1: <15 min, 2: 15-30 min, 3: 30-60 min, 4: >60 min | Context | Commute burden |

---

### Tier 1: Prior History & External Academic Support
Prior academic record and support structures established before or at the start of the term.

| Attribute | Description | Type | Domain / Levels | Group | Notes / Concerns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `failures` | Number of past class failures | Ordinal | 0 – 3 | Academic history | **Note:** Capped at 3 in dataset (3 represents "≥ 3 failures"). Strong negative risk indicator. |
| `schoolsup` | Extra educational school support | Categorical | `yes`, `no` | Support | Compensatory institutional intervention |
| `famsup` | Family educational support | Categorical | `yes`, `no` | Support | Homework assistance / tutoring at home |
| `paid` | Extra paid classes in course subject | Categorical | `yes`, `no` | Support | Private tutoring (subject-specific) |
| `activities` | Extracurricular activities | Categorical | `yes`, `no` | Behavioral history | School clubs, sports, or cultural activities |
| `nursery` | Attended nursery school | Categorical | `yes`, `no` | Academic history | Early childhood education |
| `higher` | Aspires to higher education | Categorical | `yes`, `no` | Motivation | Educational ambition |

---

### Tier 2: In-Term Behavior, Habits & Attendance
Behavioral metrics recorded during the term.

| Attribute | Description | Type | Domain / Levels | Group | Notes / Concerns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `studytime` | Weekly study time | Ordinal | 1: <2 hrs, 2: 2-5 hrs, 3: 5-10 hrs, 4: >10 hrs | Behavior | Self-reported weekly commitment |
| `absences` | Number of school absences | Numeric | 0 – 93 | Attendance | Highly right-skewed. Evaluated in S2 and ablated in S2-noabs. |
| `freetime` | Free time after school | Ordinal | 1 (very low) – 5 (very high) | Behavior | Self-reported 5-point Likert scale |
| `goout` | Going out with friends | Ordinal | 1 (very low) – 5 (very high) | Behavior | Peer socialization frequency |
| `Dalc` | Workday alcohol consumption | Ordinal | 1 (very low) – 5 (very high) | Habits | 5-point Likert scale |
| `Walc` | Weekend alcohol consumption | Ordinal | 1 (very low) – 5 (very high) | Habits | 5-point Likert scale |
| `health` | Current health status | Ordinal | 1 (very bad) – 5 (very good) | Wellbeing | Self-reported physical health |
| `romantic` | In a romantic relationship | Categorical | `yes`, `no` | Social | Personal relationship status |
| `internet` | Internet access at home | Categorical | `yes`, `no` | Context | Digital connectivity proxy |
| `famrel` | Quality of family relationships | Ordinal | 1 (very bad) – 5 (very good) | Family | Self-reported family climate |

---

### Tier 3 & Tier 4: Intermediate Academic Checkpoints
Official interim grades recorded at subsequent periods.

| Attribute | Description | Type | Domain / Levels | Tier | Group | Notes / Concerns |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `G1` | First period grade | Numeric | 0 – 20 | T3 | Assessment | First official academic exam result |
| `G2` | Second period grade | Numeric | 0 – 20 | T4 | Assessment | Near-oracle predictor of final G3 grade |

---

## 3. Cumulative Information Sets

- **S0:** T0 (Enrolment Context)
- **S1:** T0 + T1 (Background + History)
- **S2:** T0 + T1 + T2 (Pre-Exam Complete Profile)
- **S3:** S2 + G1 (Mid-Term Checkpoint)
- **S4:** S2 + G1 + G2 (Late-Term Near-Oracle)
- **S2-noabs:** S2 excluding `absences` (Sensitivity test for temporal integrity)
