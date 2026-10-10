"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Crosshair,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  Moon,
  Scale,
  TreePine,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { COMMAND_OPEN_EVENT, type ViewKey } from "@/components/layout/AppShell";

/**
 * CommandPalette — ⌘K / Ctrl+K. Pages · Models · Actions.
 * Model items deep-link to #/experiments.
 */
export function CommandPalette({
  onNavigate,
}: {
  onNavigate: (view: ViewKey) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_OPEN_EVENT, onOpen);
    };
  }, []);

  const run = (view: ViewKey) => {
    setOpen(false);
    onNavigate(view);
  };

  const toggleTheme = () => {
    const next =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setOpen(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search pages, experiments and actions"
      className="glass max-w-[520px] rounded-lg border-hairline shadow-e3"
    >
      <CommandInput placeholder="Search pages, experiments, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => run("overview")}>
            <LayoutDashboard aria-hidden />
            Overview
          </CommandItem>
          <CommandItem onSelect={() => run("experiments")}>
            <FlaskConical aria-hidden />
            Experiments
          </CommandItem>
          <CommandItem onSelect={() => run("predict")}>
            <Crosshair aria-hidden />
            Predict
          </CommandItem>
          <CommandItem onSelect={() => run("about")}>
            <BookOpen aria-hidden />
            About
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Models">
          <CommandItem onSelect={() => run("experiments")}>
            <LineChart aria-hidden />
            Logistic regression (L2)
          </CommandItem>
          <CommandItem onSelect={() => run("experiments")}>
            <Scale aria-hidden />
            Ridge regression
          </CommandItem>
          <CommandItem onSelect={() => run("experiments")}>
            <TreePine aria-hidden />
            Decision tree
          </CommandItem>
          <CommandItem onSelect={() => run("experiments")}>
            <FlaskConical aria-hidden />
            Random forest
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={toggleTheme}>
            <Moon aria-hidden />
            Toggle theme
          </CommandItem>
          <CommandItem onSelect={() => run("predict")}>
            <Crosshair aria-hidden />
            Try the predictor
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <p className="px-4 py-2 text-[11px] text-ink-4">
          <span className="num">⌘K</span> or <span className="num">Ctrl K</span> to toggle ·{" "}
          <span className="num">Esc</span> to close
        </p>
      </CommandList>
    </CommandDialog>
  );
}
