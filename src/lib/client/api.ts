"use client";

/**
 * EduInsight AI — typed API client + TanStack Query hooks.
 * Shapes verified against the live backend (Task 2-a smoke + live curls).
 * staleTime 5 min · 1 retry · errors thrown for <ErrorState />.
 */

import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";

/* ------------------------------------------------------------------ types */

export type Subject = "math" | "por";
export type OverviewSubject = Subject | "both";
export type Task = "classification" | "regression";
export type InfoSet = "S0" | "S1" | "S2" | "S3" | "S4" | "S2-noabs";
export type LadderSet = "S0" | "S1" | "S2" | "S3" | "S4";
export type RiskLevel = "lower" | "moderate" | "higher" | "uncertain";

export interface MetricStat {
  mean: number;
  sd: number;
  ci: [number, number];
  n: number;
}

export interface RunRow {
  infoSet: InfoSet;
  model: string;
  nFeatures: number;
  primaryMetric: string;
  metrics: Record<string, MetricStat | null>;
}

export interface ExperimentsResponse {
  subject: Subject;
  task: Task;
  runs: RunRow[];
}

export interface HealthDataset {
  subject: Subject;
  name: string;
  nRows: number;
  nFeatures: number;
  nZeroG3: number;
  sha256: string;
  license: string;
  version: string;
}

export interface HealthResponse {
  status: string;
  engine: string;
  datasets: HealthDataset[];
  counts: { experiments: number; predictions: number };
  seededAt: string;
}

export interface OverviewKpis {
  n: number;
  atRiskShare: number;
  meanG3: number;
  zeroG3Share: number;
  meanAbsences: number;
  matchedPairs?: number;
}

export interface GradeDistribution {
  grade: "G1" | "G2" | "G3";
  bins: { value: number; count: number }[];
}

export interface RidgePoint {
  x: number;
  density: number;
}

export interface RidgeSeries {
  grade: "G1" | "G2" | "G3";
  points: RidgePoint[];
}

export interface AbsencesBin {
  bin: string;
  count: number;
}

export interface RiskSubgroup {
  feature: string;
  levels: { level: string; n: number; riskShare: number }[];
}

export interface Association {
  feature: string;
  type: "categorical" | "numeric";
  effect: "cramersV" | "cliffsDelta";
  value: number;
  p: number;
  q: number;
}

export interface G3ZeroCluster {
  n: number;
  shareOfAll: number;
  meanAbsences: number;
  shareBelowPass: number;
}

export interface OverviewResponse {
  subject: OverviewSubject;
  kpis: OverviewKpis;
  distributions: GradeDistribution[];
  ridgeline: RidgeSeries[];
  absencesHist: AbsencesBin[];
  riskBySubgroup: RiskSubgroup[];
  associations: Association[];
  g3ZeroCluster: G3ZeroCluster;
  evidence: { passMark: number; dataset: string };
}

export interface HypothesisDetail {
  comparison: string;
  delta: number;
  ci: [number, number];
  pAdj: number;
}

export interface Hypothesis {
  id: string;
  title: string;
  decisionRule: string;
  status: "supported" | "not_supported" | "inconclusive";
  result: string;
  detail: HypothesisDetail[];
}

export interface HypothesesResponse {
  subject: Subject;
  hypotheses: Hypothesis[];
}

export interface StabilitySeed {
  seed: number;
  top: { feature: string; score: number }[];
}

export interface StabilityModel {
  seeds: StabilitySeed[];
  meanJaccard: number | null;
  kendall: number | null;
}

export interface StabilityResponse {
  infoSet: InfoSet;
  logistic: StabilityModel;
  forest: StabilityModel;
  crossModelJaccard: number | null;
}

export interface AblationResponse {
  infoSet: InfoSet;
  full: { mean: number; ci: [number, number] };
  dropped: { group: string; mean: number; delta: number }[];
}

export interface TransferRow {
  direction: string;
  nTrain: number;
  nTest: number;
  prAuc: number;
  rocAuc: number;
}

export interface TransferResponse {
  transfers: TransferRow[];
}

export interface SubgroupLevel {
  level: string;
  n: number;
  recall: number;
  fpr: number;
  precision: number;
  ciRecall: [number, number];
  insufficient: boolean;
}

export interface SubgroupGroup {
  feature: string;
  levels: SubgroupLevel[];
}

export interface SubgroupsResponse {
  subject: Subject;
  infoSet: InfoSet;
  threshold: number;
  overall: { recall: number; precision: number; n: number; brier: number; ece: number };
  groups: SubgroupGroup[];
}

export interface OofResponse {
  y: number[];
  pred: number[];
}

export interface FeatureMeta {
  name: string;
  label: string;
  tier: "T0" | "T1" | "T2" | "T3" | "T4";
  group: string;
  type: "categorical" | "numeric";
  levels?: string[];
  min?: number;
  max?: number;
  step?: number;
  description: string;
}

export interface InfoSetMeta {
  label: string;
  description: string;
  tiers: string[];
}

export interface MetaResponse {
  featureMeta: FeatureMeta[];
  infoSets: Record<string, InfoSetMeta>;
  models: Record<string, string>;
}

export interface PredictContribution {
  feature: string;
  value: string;
  contribution: number;
  direction: "toward_risk" | "away_from_risk";
  rank?: number;
}

export interface PredictResponse {
  id: string;
  subject: Subject;
  infoSet: InfoSet;
  probability: number;
  logOdds: number;
  interval: [number, number];
  conformalSet: number[];
  riskLevel: RiskLevel;
  baseRate: number;
  contributions: PredictContribution[];
  otherFactors: { count: number; contribution: number } | null;
  model: { name: string; infoSet: InfoSet; version: string; ece: number | null; n: number };
  issues: [];
}

export interface ExplainResponse {
  predictionId: string;
  baseRate: number;
  contributions: PredictContribution[];
  finalProbability: number;
  note: string;
}

export interface FeatureIssue {
  feature: string;
  message: string;
}

/* ------------------------------------------------------------------ fetch */

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const msg =
      (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    const err = new Error(msg) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  return jsonOrThrow<T>(res);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<T>(res);
}

/* ------------------------------------------------------------------ hooks */

const STALE = 5 * 60 * 1000;

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => get<HealthResponse>("/api/health"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useOverview(subject: OverviewSubject) {
  return useQuery({
    queryKey: ["overview", subject],
    queryFn: () => get<OverviewResponse>(`/api/overview?subject=${subject}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useExperiments(subject: Subject, task: Task) {
  return useQuery({
    queryKey: ["experiments", subject, task],
    queryFn: () => get<ExperimentsResponse>(`/api/experiments?subject=${subject}&task=${task}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useOof(params: {
  subject: Subject;
  task: Task;
  infoSet: InfoSet;
  model: string;
}) {
  const qs = new URLSearchParams({
    subject: params.subject,
    task: params.task,
    infoSet: params.infoSet,
    model: params.model,
  });
  return useQuery({
    queryKey: ["oof", params.subject, params.task, params.infoSet, params.model],
    queryFn: () => get<OofResponse>(`/api/experiments/oof?${qs.toString()}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useHypotheses(subject: Subject) {
  return useQuery({
    queryKey: ["hypotheses", subject],
    queryFn: () => get<HypothesesResponse>(`/api/experiments/hypotheses?subject=${subject}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useStability(subject: Subject) {
  return useQuery({
    queryKey: ["stability", subject],
    queryFn: () => get<StabilityResponse>(`/api/experiments/stability?subject=${subject}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useAblation(subject: Subject) {
  return useQuery({
    queryKey: ["ablation", subject],
    queryFn: () => get<AblationResponse>(`/api/experiments/ablation?subject=${subject}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useTransfer() {
  return useQuery({
    queryKey: ["transfer"],
    queryFn: () => get<TransferResponse>("/api/transfer"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useSubgroups(subject: Subject, infoSet: InfoSet = "S2") {
  return useQuery({
    queryKey: ["subgroups", subject, infoSet],
    queryFn: () => get<SubgroupsResponse>(`/api/subgroups?subject=${subject}&infoSet=${infoSet}`),
    staleTime: STALE,
    retry: 1,
  });
}

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => get<MetaResponse>("/api/meta"),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export type PredictInput = {
  subject: Subject;
  infoSet: InfoSet;
  features: Record<string, string | number>;
};

export function usePredict(): UseMutationResult<
  PredictResponse,
  Error & { status?: number; body?: { issues?: FeatureIssue[] } },
  PredictInput
> {
  return useMutation({
    mutationFn: (input: PredictInput) => post<PredictResponse>("/api/predict", input),
  });
}

export function useExplain(): UseMutationResult<
  ExplainResponse,
  Error,
  { predictionId: string }
> {
  return useMutation({
    mutationFn: (input: { predictionId: string }) =>
      post<ExplainResponse>("/api/explain", input),
  });
}
