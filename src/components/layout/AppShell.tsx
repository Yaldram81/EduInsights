"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Crosshair,
  FlaskConical,
  LayoutDashboard,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { ApertureLine } from "@/components/brand/ApertureLine";
import { Monogram } from "@/components/brand/Monogram";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

export type ViewKey = "landing" | "overview" | "experiments" | "predict" | "about";

export const COMMAND_OPEN_EVENT = "eduinsight:open-command";

const NAV: {
  key: Exclude<ViewKey, "landing">;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, href: "#/overview" },
  { key: "experiments", label: "Experiments", icon: FlaskConical, href: "#/experiments" },
  { key: "predict", label: "Predict", icon: Crosshair, href: "#/predict" },
  { key: "about", label: "About", icon: BookOpen, href: "#/about" },
];

function NavItem({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  compact?: boolean;
  onNavigate: (view: ViewKey) => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(item.key);
      }}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-200 ease-silk",
        active ? "bg-raised text-ink-1" : "text-ink-2 hover:bg-hover-surface hover:text-ink-1",
        compact && "flex-col justify-center gap-1 px-1 py-2 text-[11px]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gold-500"
        />
      ) : null}
      <Icon
        aria-hidden
        className={cn("size-4 shrink-0", active ? "text-gold-400" : "text-ink-3")}
      />
      <span className={compact ? "leading-none" : undefined}>{item.label}</span>
    </a>
  );
}

export function AppShell({
  view,
  onNavigate,
  children,
}: {
  view: ViewKey;
  onNavigate: (view: ViewKey) => void;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const current =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };

  const openPalette = () => window.dispatchEvent(new CustomEvent(COMMAND_OPEN_EVENT));

  const skipToContent = () => {
    const main = document.getElementById("content");
    main?.focus();
    main?.scrollIntoView();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <button
        type="button"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-raised focus:px-4 focus:py-2 focus:text-sm focus:text-ink-1 focus:shadow-e3"
      >
        Skip to content
      </button>

      <div className="flex w-full flex-1">
        {/* ------------------------------------------------- desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-hairline bg-section lg:flex">
          <ApertureLine className="absolute inset-x-0 top-0" />
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("landing");
            }}
            className="flex items-center gap-2.5 px-5 pb-5 pt-6"
          >
            <Monogram size={28} />
            <Wordmark />
          </a>
          <nav aria-label="Primary" className="flex-1 px-3 py-2">
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => (
                <li key={item.key}>
                  <NavItem
                    item={item}
                    active={view === item.key}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-hairline px-5 py-4">
            <p className="text-[11px] leading-relaxed text-ink-4">
              EduInsight AI · research prototype
              <br />
              UCI Student Performance
            </p>
          </div>
        </aside>

        {/* ----------------------------------------------------- main column */}
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col lg:pl-[264px]">
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 px-4 lg:px-8">
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("landing");
              }}
              className="flex items-center gap-2"
            >
              <Monogram size={22} className="lg:hidden" />
              <Wordmark compact />
            </a>
            <span
              className="ml-2 hidden items-center gap-2 rounded-xs border border-hairline bg-canvas/60 px-2.5 py-1 text-[11px] text-ink-3 sm:inline-flex"
              title="Dataset context"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-gold-500" />
              UCI Student Performance · v2023-05
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                className="flex size-9 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-hover-surface hover:text-ink-1"
              >
                {theme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={openPalette}
                aria-label="Open command palette"
                className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-canvas/60 px-3 text-xs text-ink-3 transition-colors hover:border-gold-700 hover:text-ink-1"
              >
                <Search className="size-3.5" aria-hidden />
                <span className="num hidden sm:inline">⌘K</span>
              </button>
            </div>
          </header>

          <main
            id="content"
            tabIndex={-1}
            className="flex-1 focus:outline-none"
          >
            <div className="mx-auto w-full max-w-[1360px] px-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] py-10 lg:px-10 lg:pb-14">
              {children}
            </div>
          </main>

          {/* ------------------------------------------- persistent disclaimer */}
          <footer className="mt-auto border-t border-hairline bg-section">
            <p className="mx-auto max-w-[1360px] px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 text-xs leading-relaxed text-ink-3 lg:px-10 lg:pb-3">
              Research prototype trained on Portuguese secondary-school data (UCI Student
              Performance). Not for decisions about real students.
            </p>
          </footer>
        </div>
      </div>

      {/* ------------------------------------------------ mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-section/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => (
            <li key={item.key}>
              <NavItem item={item} active={view === item.key} compact onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
