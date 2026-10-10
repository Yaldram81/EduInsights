"use client";

/**
 * EduInsight AI — single-route app. Views switch by location.hash:
 *   "" | "#/"            → Landing
 *   "#/overview"         → Overview
 *   "#/experiments"      → Experiments
 *   "#/predict"          → Predict
 *   "#/about"            → About
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell, type ViewKey } from "@/components/layout/AppShell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { LandingView } from "@/components/views/LandingView";
import { OverviewView } from "@/components/views/OverviewView";
import { ExperimentsView } from "@/components/views/ExperimentsView";
import { PredictView } from "@/components/views/PredictView";
import { AboutView } from "@/components/views/AboutView";

const VIEWS: ViewKey[] = ["landing", "overview", "experiments", "predict", "about"];

function viewFromHash(hash: string): ViewKey {
  const h = hash.replace(/^#\/?/, "");
  if (h === "") return "landing";
  return (VIEWS as string[]).includes(h) ? (h as ViewKey) : "landing";
}

function hashForView(view: ViewKey): string {
  return view === "landing" ? "#/" : `#/${view}`;
}

export default function Home() {
  const [queryClient] = useMemo(
    () =>
      [
        new QueryClient({
          defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
        }),
      ] as const,
    [],
  );
  // SSR-safe: the hash is only read after mount (window is unavailable on the server)
  const [view, setView] = useState<ViewKey>("landing");

  useEffect(() => {
    const sync = () => setView(viewFromHash(window.location.hash));
    sync();
    const onHashChange = () => setView(viewFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  const onNavigate = useCallback((next: ViewKey) => {
    const target = hashForView(next);
    if (window.location.hash === target) setView(next);
    else window.location.hash = target;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell view={view} onNavigate={onNavigate}>
        {view === "overview" ? (
          <OverviewView />
        ) : view === "experiments" ? (
          <ExperimentsView />
        ) : view === "predict" ? (
          <PredictView />
        ) : view === "about" ? (
          <AboutView />
        ) : (
          <LandingView />
        )}
      </AppShell>
      <CommandPalette onNavigate={onNavigate} />
    </QueryClientProvider>
  );
}
