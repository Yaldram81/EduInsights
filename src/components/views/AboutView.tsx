import { CopyButton } from "@/components/data/CopyButton";
import { SectionHeading } from "@/components/data/SectionHeading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * AboutView — the study documentation: intended use, data scope, tiers,
 * methodology, metrics, fairness stance, limitations, what this tool is
 * not, and the citation. Static copy — dataset facts only, no results.
 */

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-12 font-display text-2xl font-medium text-ink-1">{children}</h3>
  );
}

const TIERS = [
  {
    tier: "T0",
    columns: "School, sex, age, address, family size & cohabitation, parents' education & jobs, reason, guardian, travel time",
    meaning: "Known at enrolment — before any behaviour is observed",
  },
  {
    tier: "T1",
    columns: "Past class failures, nursery, higher-education intent, school/family support, paid classes, activities",
    meaning: "History and support context — accumulated before the course",
  },
  {
    tier: "T2",
    columns: "Study time, free time, going out, workday/weekend alcohol, health, romantic relationship, internet, family relations, absences",
    meaning: "Behaviour and attendance during the course",
  },
  {
    tier: "T3",
    columns: "G1 — first period grade (0–20)",
    meaning: "First graded checkpoint",
  },
  {
    tier: "T4",
    columns: "G2 — second period grade (0–20)",
    meaning: "Second graded checkpoint — near-oracle at S4",
  },
];

const NOT_LIST = [
  "Not a production screening tool — every number here is a research measurement on a fixed 2008 dataset, not a live evaluation.",
  "Not causal: coefficients and effects are associations. Removing a feature does not remove the thing it stands for.",
  "Not individual diagnosis: subgroup and fairness panels analyse model behaviour, never students.",
  "Not a substitute for teachers, psychologists or families — the honest intervals are often wide enough to change the decision.",
  "Not externally validated: no second country, no later cohort, no deployment audit in this build.",
];

const CITATION = `Cortez, P., & Silva, A. (2008). Using data mining to predict secondary school student performance. In A. Brito & J. Teixeira (Eds.), Proceedings of the 5th FUture BUsiness TEChnology Conference (FUBUTEC 2008), pp. 5–12, Porto, Portugal. Eurosis.
Dataset: UCI Machine Learning Repository — Student Performance. DOI: 10.24432/C5GC66. License: CC BY 4.0.`;

export function AboutView() {
  return (
    <div className="mx-auto flex max-w-[72ch] flex-col pb-4">
      <SectionHeading
        overline="About"
        title="What this study is, exactly"
        description="EduInsight AI is a research prototype: one honest pipeline, from a real dataset to calibrated, explained predictions — with every assumption written down."
      />

      <H>Intended use</H>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        This is a teaching and research artifact for studying how early-warning models behave
        under information constraints. It demonstrates what a defensible student-risk analysis
        looks like: preregistered hypotheses, honest baselines, calibrated probabilities,
        conformal uncertainty, stability checks and fairness reporting — and it refuses to
        dress association up as causation. It is not a screening product and must not be used
        to make decisions about real students.
      </p>

      <H>Data scope</H>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        The UCI Student Performance dataset (Cortez &amp; Silva, 2008), licensed CC BY 4.0:
        395 mathematics and 649 Portuguese students from two Portuguese secondary schools,
        33 attributes each, with 366 students matched across the two subjects (used to guard
        the transfer evaluation). Raw files are pinned by SHA-256 —{" "}
        <span className="num text-ink-3">e47f9ee2…</span> (mathematics) and{" "}
        <span className="num text-ink-3">a7594a11…</span> (Portuguese). The target is the
        final grade G3 (0–20); classification risk is G3 &lt; 10, the official pass mark.
        Students with G3 = 0 (missing final assessment) are analysed separately.
      </p>

      <H>Information tiers</H>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Features are grouped into tiers that encode when information would realistically be
        available. The five information sets S0–S4 accumulate tiers.
      </p>
      <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Tier</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Columns</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Meaning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIERS.map((t) => (
              <TableRow key={t.tier} className="border-hairline align-top">
                <TableCell className="num font-semibold text-gold-400">{t.tier}</TableCell>
                <TableCell className="text-[13px] leading-relaxed text-ink-2">{t.columns}</TableCell>
                <TableCell className="text-[13px] leading-relaxed text-ink-3">{t.meaning}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 rounded-md border border-gold-700/50 bg-gold-500/5 p-4">
        <p className="text-sm leading-relaxed text-ink-2">
          The dataset has no timestamps. Tiers encode a documented availability-order
          assumption, not a measured one — and <span className="num">S2-noabs</span> is the
          sensitivity check for that assumption, dropping the most skewed behavioural
          feature (absences) to see which conclusions survive.
        </p>
      </div>

      <H>Methodology</H>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
        <li>Grouped stratified 5-fold cross-validation, 3 repetitions, seed 42 — groups keep matched students on one side of the split.</li>
        <li>All preprocessing (one-hot encoding, z-scoring) is fitted on training folds only, then applied to validation folds.</li>
        <li>Logistic regression via IRLS with L2 penalty; histogram CART decision tree; random forest of 25 bagged trees.</li>
        <li>Split-conformal calibration at 90% (Vovk quantile) for per-prediction intervals and sets.</li>
        <li>Paired Nadeau–Bengio corrected t-tests across repetitions, with Holm correction for family-wise claims; BH-FDR for the association screen.</li>
        <li>Deterministic seeds everywhere; every run is reproducible from the pinned data and seed alone.</li>
      </ul>

      <H>Metrics</H>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Classification: primary metric PR-AUC (the at-risk class is the minority — ROC-AUC
        flatters naive models); secondaries ROC-AUC, balanced accuracy, MCC, precision@10,
        recall@10, Brier score and ECE. Regression: primary metric MAE on the 0–20 scale;
        secondaries RMSE, R² and Spearman ρ. Lower-is-better metrics are marked as such
        wherever they appear.
      </p>

      <H>Fairness</H>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Recall, false-positive rate and precision are reported per level of sex, school,
        home address and age band, with 500× bootstrap confidence intervals and a minimum
        cell size of 30 — smaller cells are flagged &ldquo;insufficient sample&rdquo; rather
        than interpreted. This is an analysis of model behaviour, not a basis for decisions
        about individuals.
      </p>

      <H>Limitations</H>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
        <li>The availability-order assumption behind the tiers is plausible but unproven; S2-noabs is the check, not a proof.</li>
        <li>One country, two schools, one academic snapshot — modest n and no external cohort in this build.</li>
        <li>The G3 = 0 cluster is a missing-data artifact handled separately, not a genuine zero.</li>
        <li>Linear-model explanations are exact; tree explanations are path-based approximations.</li>
        <li>Transfer between subjects is evaluated on few unmatched students in one direction — read those numbers with their n.</li>
      </ul>

      <H>What this tool is not</H>
      <div className="mt-3 rounded-[14px] border border-gold-600 bg-transparent p-5">
        <ul className="flex list-none flex-col gap-2.5">
          {NOT_LIST.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
              <span aria-hidden className="mt-0.5 size-1.5 shrink-0 rounded-full bg-gold-500" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <H>Citation & stack</H>
      <pre className="num mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-hairline bg-card p-4 text-[11px] leading-relaxed text-ink-2">
        {CITATION}
      </pre>
      <div className="mt-3">
        <CopyButton text={CITATION} label="Copy citation" />
      </div>
      <p className="mt-6 text-[11px] text-ink-4">
        Built with Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts · Prisma/SQLite ·
        a custom TypeScript ML engine (IRLS logistic, histogram CART, conformal calibration).
      </p>
    </div>
  );
}
