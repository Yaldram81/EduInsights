# EduInsight AI — Design System (`design.md`)

> **Design codename:** *Obsidian & Champagne*
> **Product:** EduInsight AI — explainable learning analytics and student-risk research platform
> **Stack assumed:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Radix) · Framer Motion · Recharts + D3 (custom) · next/font
> **Audience:** researchers, supervisors, educators, reviewers evaluating a research portfolio

---

## 0. How to use this document

This file is the single source of truth for visual and interaction design. Every screen, chart and component must be built from the tokens and rules below. If something is missing, extend the system here first, then implement.

Sections: Philosophy · Brand · Color · Typography · Layout · Surfaces · Motion · Iconography · Data-viz language · XAI visual grammar · Components · Page blueprints · Content voice · Accessibility · Performance · Responsive · Implementation · QA checklist.

---

## 1. Design philosophy

### 1.1 The idea
A research instrument should feel like a **private observatory**: quiet, dark, precise, and unmistakably premium. Luxury here is not ornament. It comes from **restraint, material quality, generous space, impeccable typography and deliberate motion**. Gold is used like jewelry: rarely, and always for something that matters.

### 1.2 Principles

| # | Principle | Meaning in practice |
|---|-----------|--------------------|
| 1 | **Evidence first** | Every number has context: CI, n, definition. Beauty never hides uncertainty. |
| 2 | **Quiet luxury** | Dark obsidian surfaces, hairline borders, champagne accents, soft glow. No neon, no clutter. |
| 3 | **Honest uncertainty** | Probabilities are shown with intervals and calibration cues. Never a bare "HIGH RISK" stamp. |
| 4 | **Associated, not caused** | UI language and visuals never imply causation. |
| 5 | **Depth through layering** | Three-layer elevation, subtle glass, light edges — not heavy shadows. |
| 6 | **Motion with meaning** | Animations explain change (a bar grows, a score settles). Nothing bounces for decoration. |
| 7 | **Accessible by default** | Contrast, keyboard, reduced motion, color-independent encodings. Luxury includes everyone. |
| 8 | **Editorial rhythm** | Serif display type for headlines, refined sans for UI, mono for numbers. Magazine-grade hierarchy. |

### 1.3 Mood references (conceptual, not to copy)
Private-bank dashboards, high-end watch-maker sites, architectural journals, scientific-journal figures, planetarium interfaces.

### 1.4 Anti-patterns (never do)
- Pure `#000` backgrounds or pure `#fff` text.
- Rainbow charts, saturated gradients, neon glows.
- Gold on large areas (more than ~5% of any screen).
- Drop shadows heavier than the defined elevation tokens.
- Emoji as UI icons. Stock-photo hero imagery.
- Bare risk labels, accuracy numbers without CIs, causal phrasing.
- Animations longer than 700 ms or that loop without user intent.

---

## 2. Brand

### 2.1 Name and wordmark
- **Wordmark:** `EduInsight` set in the display serif (weight 500), followed by `AI` in small caps, champagne, letter-spaced +0.18em.
- **Monogram:** a lens-like "E" formed by three horizontal hairlines inside a thin circle (observatory/aperture motif). 1.25px stroke, champagne on obsidian.
- **Clear space:** height of the "E" on all sides. **Minimum size:** 20 px monogram, 96 px wordmark.

### 2.2 Tagline options
- *Understand learning. Responsibly.*
- *Evidence, not verdicts.*
- *Explainable insight for academic risk.*

### 2.3 Signature motif
**The Aperture Line:** a 1 px champagne gradient hairline (transparent → champagne → transparent) used as section dividers, card top-edges and focus accents. It is the system's recurring luxury detail.

---

## 3. Color system

### 3.1 Primary palette — "Obsidian & Champagne" (dark default)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-0` | `#07080B` | App canvas (never pure black) |
| `--bg-1` | `#0B0D12` | Page sections |
| `--bg-2` | `#10131A` | Cards (base layer) |
| `--bg-3` | `#161A23` | Raised cards, popovers |
| `--bg-4` | `#1D222D` | Hover, selected rows |
| `--line-1` | `#1F2430` | Hairline borders (default) |
| `--line-2` | `#2A3040` | Strong borders, inputs |
| `--text-1` | `#F3EFE6` | Primary text (warm ivory) |
| `--text-2` | `#B9B4A8` | Secondary text |
| `--text-3` | `#827E74` | Tertiary, captions |
| `--text-4` | `#5B5851` | Disabled |
| `--gold-300` | `#F1DFB0` | Highlights, glow core |
| `--gold-400` | `#E4C98A` | Hover accent |
| `--gold-500` | `#D4AF6A` | **Primary accent (champagne gold)** |
| `--gold-600` | `#B8924A` | Pressed |
| `--gold-700` | `#8C6C33` | Deep accent, borders |
| `--gold-glow` | `rgba(212,175,106,0.18)` | Glow, focus halo |

### 3.2 Semantic palette (muted, jewel-toned)

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| Positive / low risk | `--emerald` | `#4FB58A` | Also bg tint `rgba(79,181,138,0.12)` |
| Caution / medium | `--amber` | `#E0A84B` | Distinct from gold: more orange, used only for state |
| Critical / high risk | `--ruby` | `#D9576B` | Tint `rgba(217,87,107,0.12)` |
| Information | `--sapphire` | `#6C8BEA` | Neutral info, links in charts |
| Insight / XAI "pushes toward risk" | `--ruby` | | |
| Insight / XAI "pushes away from risk" | `--sapphire` | | Blue/red diverging pair |

> **Color-blindness rule:** risk and SHAP directions use a **blue ↔ red diverging pair** plus **shape/icon/label** redundancy (▲ ▼, "toward risk", "away from risk"). Never encode meaning by color alone.

### 3.3 Chart categorical palette (8 hues, harmonized, CVD-aware)

```
#D4AF6A  champagne   (primary series / "best model")
#6C8BEA  sapphire
#4FB58A  emerald
#C07FD6  amethyst
#E58F6B  copper
#5CC0C9  aquamarine
#D9576B  ruby
#9BA3B5  platinum    (baselines, neutral)
```

Baselines always use **platinum**, dashed. The "chosen / best" series always uses **champagne**.

### 3.4 Sequential and diverging scales
- **Sequential (risk probability):** `#10131A → #3A2F1B → #8C6C33 → #D4AF6A → #F1DFB0` (obsidian to champagne).
- **Diverging (SHAP, residuals):** `#6C8BEA ← #1D222D → #D9576B`, center is neutral obsidian-grey.

### 3.5 Light theme ("Ivory & Ink") — optional but supported

| Token | Hex |
|-------|-----|
| `--bg-0` | `#F7F4EC` |
| `--bg-1` | `#FBF9F3` |
| `--bg-2` | `#FFFFFF` |
| `--bg-3` | `#F1EDE2` |
| `--line-1` | `#E6E0D0` |
| `--text-1` | `#16130C` |
| `--text-2` | `#4D483C` |
| `--text-3` | `#7C766A` |
| `--gold-500` | `#9A7430` (darker for contrast on light) |

### 3.6 Gradients

```css
--grad-aperture: linear-gradient(90deg, transparent, var(--gold-500), transparent);
--grad-sheen:    linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 40%);
--grad-gold:     linear-gradient(135deg, #F1DFB0 0%, #D4AF6A 45%, #8C6C33 100%);
--grad-canvas:   radial-gradient(1200px 600px at 80% -10%, rgba(212,175,106,0.08), transparent 60%),
                 radial-gradient(900px 500px at 0% 0%, rgba(108,139,234,0.06), transparent 55%);
```

`--grad-gold` is for primary buttons, the monogram, and key numerals only.

### 3.7 Contrast targets (WCAG 2.2)
- `--text-1` on `--bg-2`: ≥ 14:1. `--text-2` on `--bg-2`: ≥ 7:1. `--text-3` on `--bg-2`: ≥ 4.5:1 (only for non-essential captions).
- `--gold-500` on `--bg-2`: ≥ 7:1 for text.
- Chart lines against background: ≥ 3:1 (non-text contrast).

---

## 4. Typography

### 4.1 Families

| Role | Font | Fallback | Use |
|------|------|----------|-----|
| **Display** | *Fraunces* (opsz axis, soft 50, weight 400–600) or *Cormorant Garamond* | `Georgia, serif` | Hero, page titles, big numerals |
| **UI / Body** | *Geist Sans* or *Inter Tight* | `system-ui, sans-serif` | Interface, body |
| **Numerals / Code** | *Geist Mono* or *JetBrains Mono* | `ui-monospace, monospace` | Metrics, tables, code, IDs |

Use `font-variant-numeric: tabular-nums lining-nums;` on all numeric UI. Load via `next/font` with `display: swap`.

### 4.2 Type scale (fluid, 1.250 ratio)

| Token | Size (clamp) | Line | Weight | Font | Use |
|-------|--------------|------|--------|------|-----|
| `display-xl` | `clamp(3.5rem, 6vw, 5.5rem)` | 1.02 | 400 | Display | Landing hero |
| `display-lg` | `clamp(2.5rem, 4vw, 3.75rem)` | 1.06 | 400 | Display | Page hero |
| `h1` | `clamp(2rem, 3vw, 2.75rem)` | 1.1 | 500 | Display | Page titles |
| `h2` | `1.75rem` | 1.2 | 500 | Display | Sections |
| `h3` | `1.25rem` | 1.3 | 600 | UI | Card titles |
| `body-lg` | `1.0625rem` | 1.65 | 400 | UI | Intro paragraphs |
| `body` | `0.9375rem` | 1.6 | 400 | UI | Default |
| `small` | `0.8125rem` | 1.5 | 400 | UI | Meta |
| `caption` | `0.75rem` | 1.4 | 500 | UI | Captions, labels |
| `overline` | `0.6875rem` | 1.2 | 600, +0.16em, uppercase | UI | Section eyebrows |
| `metric-xl` | `clamp(2.75rem, 4vw, 4rem)` | 1 | 400 | Display | Hero KPIs |
| `metric` | `2rem` | 1 | 500 | Mono/Display | KPI numbers |

### 4.3 Typographic rules
- Headlines: display serif, tight tracking (`-0.01em`), balanced wrapping (`text-wrap: balance`).
- Body: max measure **68 characters**.
- Overlines (eyebrows) in champagne above headings, small caps feel.
- Numbers: always tabular; units in `--text-3` at 60% size, e.g., `0.81` with `prob` caption.
- Use true typographic punctuation (— … “ ” ×) and the minus sign `−`.
- Italic display serif for editorial emphasis in one word per heading at most.

---

## 5. Layout, spacing and grid

### 5.1 Spacing scale (4 px base)

`0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`
Section vertical rhythm: **96 px** desktop, **64 px** tablet, **48 px** mobile. Generous space is part of the luxury.

### 5.2 Grid
- **Desktop ≥1280:** 12 columns, 24 px gutters, max content width **1360 px**, side margin 48 px.
- **Laptop 1024–1279:** 12 columns, 20 px gutters, margin 32 px.
- **Tablet 768–1023:** 8 columns, margin 24 px.
- **Mobile <768:** 4 columns, margin 16 px.

### 5.3 App shell

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▓ Top bar (64px): breadcrumb · command palette (⌘K) · theme · avatar │
├───────────┬──────────────────────────────────────────────────────────┤
│  Sidebar  │                                                          │
│  (264px,  │   Content canvas (max 1360, scroll area)                 │
│  collaps- │                                                          │
│  ible to  │   Page header → Filters → Primary visual → Detail grid   │
│  72px)    │                                                          │
│           │                                                          │
└───────────┴──────────────────────────────────────────────────────────┘
```

- Sidebar: obsidian `--bg-1`, hairline right border, Aperture Line at top; items 44 px tall; active item has a 2 px champagne left rail + subtle `--bg-3` fill.
- Top bar: translucent glass (`backdrop-blur-xl`), hairline bottom border.
- Persistent **context chip** in the top bar: `Dataset: UCI Student Performance · Info set: S2 · Model: CatBoost v1.2`.

### 5.4 Radii

| Token | px | Use |
|-------|----|-----|
| `--r-xs` | 6 | Chips, tags |
| `--r-sm` | 10 | Inputs, buttons |
| `--r-md` | 14 | Cards |
| `--r-lg` | 20 | Hero panels, modals |
| `--r-xl` | 28 | Feature sections |
| `--r-full` | 999 | Pills, avatars |

---

## 6. Surfaces, elevation and materials

### 6.1 Elevation (dark mode uses light edges instead of heavy shadows)

| Level | Background | Border | Shadow | Use |
|-------|------------|--------|--------|-----|
| E0 | `--bg-0` | none | none | Canvas |
| E1 | `--bg-2` | 1px `--line-1` | `0 1px 0 rgba(255,255,255,0.03) inset` | Cards |
| E2 | `--bg-3` | 1px `--line-2` | `0 8px 24px rgba(0,0,0,0.35)` | Raised cards, dropdowns |
| E3 | `--bg-3` + sheen | 1px `--line-2` + top light edge | `0 24px 64px rgba(0,0,0,0.5)` | Modals, command palette |
| Glow | — | 1px `--gold-700` | `0 0 0 4px var(--gold-glow)` | Focus, active highlight |

### 6.2 Signature card
- Background `--bg-2`, hairline border, radius 14.
- **Top Aperture Line** (1 px champagne gradient, 40% opacity) on featured cards.
- Subtle `--grad-sheen` overlay in the top-left corner.
- On hover: border brightens to `--gold-700`, background lifts to `--bg-3`, 200 ms.

### 6.3 Glass
Use only for the top bar, floating toolbars and command palette:
`background: rgba(16,19,26,0.65); backdrop-filter: blur(20px) saturate(140%); border: 1px solid rgba(255,255,255,0.06);`

### 6.4 Texture
Optional ultra-subtle film grain overlay (2–3% opacity SVG noise) on the canvas for a tactile, printed feel. Disabled under `prefers-reduced-transparency`.

### 6.5 Canvas atmosphere
Apply `--grad-canvas` to the page background plus a very faint **star-field / constellation dot grid** (1 px dots, 2% opacity, 32 px spacing) behind hero areas, referencing the observatory idea.

---

## 7. Motion

### 7.1 Principles
- Motion clarifies state changes, guides focus, and signals quality.
- **Durations:** micro 120–180 ms · standard 240–320 ms · emphasis 480–640 ms · page 400 ms.
- Max simultaneous animated elements per view: ~8. Stagger 40–60 ms.

### 7.2 Easing tokens

```css
--ease-out:      cubic-bezier(0.22, 1, 0.36, 1);   /* default, "silk" */
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1); /* use rarely, tiny overshoot */
```

For Framer Motion springs: `{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }`.

### 7.3 Signature animations

| Name | Behavior |
|------|----------|
| **Aperture reveal** | The Aperture Line draws from the center outward (scaleX 0 → 1, 600 ms) when a page or hero loads |
| **Number settle** | KPI numerals count up with easing, then lock with a 1-frame champagne flash; respects reduced motion |
| **Bar growth** | Bars grow from baseline, 480 ms, stagger 40 ms |
| **Line draw** | Chart lines draw via `stroke-dashoffset`, 800 ms; CI bands fade in after |
| **SHAP cascade** | Contributions slide in sequentially from the base value to the final prediction (waterfall), each 240 ms |
| **Card hover** | translateY(−2px) + border brighten, 200 ms |
| **Shimmer skeleton** | Slow diagonal champagne-tinted shimmer, 1.8 s |
| **Page transition** | Fade + 8 px upward slide, 320 ms; sidebar stays fixed |

### 7.4 Reduced motion
When `prefers-reduced-motion: reduce`: disable count-ups, line draws, parallax and stagger; use opacity-only transitions ≤ 120 ms.

---

## 8. Iconography and imagery

- **Icon set:** Lucide (1.5 px stroke) or Phosphor Light. Size 16/20/24. Color follows text tokens; active icons use champagne.
- **Illustrations:** abstract line geometry (constellations, apertures, orbits) drawn in 1 px champagne on obsidian. No cartoon characters.
- **Imagery:** no stock photos. Data-art backgrounds generated from real results (e.g., SHAP beeswarm blurred as a hero backdrop).
- **Favicon/OG:** monogram on obsidian with a champagne hairline.

---

## 9. Data-visualization language

### 9.1 General chart rules
- Dark chart canvas = `--bg-2`; no chart border boxes; hairline gridlines `rgba(255,255,255,0.05)`; axis text `--text-3` at 12 px mono for ticks.
- **Direct labeling** over legends where possible.
- Always show **n**, **metric definition** and **uncertainty** (CI band or error bar) under or inside each chart.
- Title as a **finding statement** when interpreting (e.g., "Adding G2 improves MAE by 0.41 [0.30, 0.52]"), but **only with real numbers from logged results**. Placeholder charts must be visibly labeled `SAMPLE DATA`.
- Tooltips: E3 glass card, mono numbers, show mean, CI, n.
- Baselines: platinum dashed. Best model: champagne solid, 2.5 px.

### 9.2 Chart catalog and specs

| Chart | Purpose | Spec |
|-------|---------|------|
| **Accumulation curve** | RQ1: performance vs information tier | X: S0…S4 (ordinal, labeled), Y: metric; one line per model; CI bands (12% opacity); baseline dashed; the "G3 = G2" rule shown as a horizontal reference |
| **Model comparison forest plot** | RQ2 | Dot + 95% CI per model, sorted by mean; vertical reference line at the best baseline; significance markers (●) after Holm correction |
| **Reliability diagram** | Calibration | Diagonal reference in platinum, curve in champagne, histogram of predictions below, ECE badge |
| **Decision curve** | Net benefit | Model vs treat-all vs treat-none, shaded useful threshold range |
| **Precision/recall @ top-k** | Intervention budget | Slider for k (5–30%), live update, annotate "students flagged" |
| **Confusion matrix** | Errors | 2×2 tiles with sequential obsidian→champagne fill, counts + row %; FN tile outlined in ruby hairline |
| **Residual plot** | Regression errors | Scatter with LOESS line, G3 = 0 points marked with a distinct ◆ |
| **Conformal coverage** | Uncertainty | Bar of empirical vs nominal coverage + interval-width distribution |
| **Ablation heatmap** | Feature-group importance | Rows: groups, columns: metrics; diverging scale centered on full-model score |
| **Stability matrix** | RQ4 | Heatmap of pairwise Jaccard/Kendall τ between models/seeds |
| **Subgroup forest plot** | Fairness | Recall/FPR per subgroup with bootstrap CI, n shown, groups with n < 30 greyed with "insufficient sample" |
| **Distribution ridgelines** | EDA | Ridgeline of G1/G2/G3 distributions, champagne gradient fills at 35% |

### 9.3 Table style
- Row height 48 px, hairline row dividers only, no zebra. Sticky header with glass blur. Numeric columns right-aligned, mono, tabular. Best value per column marked with a champagne dot. Selected row: left champagne rail + `--bg-4`. Column sorting indicated with a small chevron; focusable header buttons.

---

## 10. XAI visual grammar

This is the product's signature surface. It must be unmistakably elegant and honest.

### 10.1 Global importance
Horizontal bars, sorted, **grouped by feature group** (Demographic, Family, History, Behavior, Attendance, Assessment) with group labels as overlines. Toggle: *Per feature / By group*. Show **stability whiskers** (min–max of mean |SHAP| across seeds) on each bar.

### 10.2 Local explanation — the Waterfall of Evidence

```
 Base rate (dataset average risk)          0.18
 ───────────────────────────────────────────────
  absences: 14            ▲ +0.17  ██████▌   (toward risk)
  failures: 1             ▲ +0.14  █████▏
  studytime: 1            ▲ +0.06  ██▎
  schoolsup: yes          ▼ −0.05  ◀██       (away from risk)
  higher: yes             ▼ −0.04  ◀█▌
  … 8 other factors       ▲ +0.03
 ───────────────────────────────────────────────
  Model estimate                          0.49   [0.31 – 0.67]  conformal 90%
```

- Bars flow left-to-right (positive, ruby) and right-to-left (negative, sapphire) from a running total, connected by hairline lines.
- Each row shows feature name, value, signed contribution (mono), and a ▲/▼ glyph.
- Final line: estimate in a champagne-outlined capsule with the interval.
- Header copy: **"Factors associated with this prediction"**. Footer microcopy: *"Associations learned by the model — not causes."*

### 10.3 Beeswarm / summary plot
Dots colored by feature value (low → high: sapphire → ruby), jittered, hover shows the student ID (anonymized) and value. Provide a **table alternative** for accessibility.

### 10.4 Stability view
"Do explanations agree?" — small multiples of top-5 rankings per seed/model with connecting lines (rank-slope chart), plus a numeric Jaccard badge.

### 10.5 What-if explorer (caution UI)
Sliders to vary inputs with a persistent notice: *"Exploring how the model responds — not what would happen to a student."* Changed features highlighted in champagne; delta in probability shown with an animated needle.

---

## 11. Components

### 11.1 Buttons

| Variant | Style | Use |
|---------|-------|-----|
| **Primary** | `--grad-gold` fill, text `#1A1405`, radius 10, height 44, subtle inner highlight, hover brightens + 4 px gold glow | Main CTA (one per view) |
| **Secondary** | `--bg-3` fill, 1px `--line-2`, text `--text-1`; hover border `--gold-700` | Standard actions |
| **Ghost** | transparent, text `--text-2`; hover `--bg-4` | Toolbars |
| **Outline-gold** | 1px `--gold-600` border, text `--gold-400` | Premium secondary |
| **Destructive** | ruby tint bg, ruby text | Delete/reset |

States: hover (200 ms), pressed (scale 0.98), focus-visible (2px `--gold-400` ring + 4 px glow), disabled (40% opacity), loading (inline spinner, label retained).

### 11.2 Inputs
Height 44, radius 10, `--bg-1` fill, 1px `--line-2`, label above in `caption`, helper text below. Focus: border `--gold-500` + glow. Error: ruby border + message with icon. Sliders: 2 px track, champagne filled portion, 18 px thumb with ring. Segmented controls for info set selection (S0–S4) with a sliding champagne indicator.

### 11.3 KPI card

```
┌────────────────────────────────────┐
│ ─────── (aperture line) ────────── │
│ OVERLINE  PR-AUC (S2, CatBoost)    │
│                                    │
│   0.71   ◂ metric (display serif)  │
│   95% CI [0.63, 0.78] · n = 395    │
│   ▲ +0.06 vs logistic baseline     │
│   ▁▂▃▅▆▇  (sparkline of CV folds)  │
└────────────────────────────────────┘
```

Values shown must come from logged experiments. Unknown/pending values display `—` with a "Pending" chip.

### 11.4 Risk badge (never color-only)

| Level | Visual | Text |
|-------|--------|------|
| Lower | emerald tint, ▼ icon | "Lower estimated risk" |
| Moderate | amber tint, ◆ icon | "Moderate estimated risk" |
| Higher | ruby tint, ▲ icon | "Higher estimated risk" |
| Uncertain | platinum outline, "?" icon | "Uncertain — interval spans threshold" |

Show probability and interval beside the badge.

### 11.5 Probability gauge
A thin **arc gauge** (240° sweep, 6 px stroke) with the estimate as a champagne needle, the conformal interval as a translucent arc band, the decision threshold as a tick, and tick labels in mono. Center: probability in `metric-xl`.

### 11.6 Info-set stepper ("Information Ladder")
A horizontal stepper S0 → S4; each node is a ring that fills with champagne as information is added; the selected node glows. Beneath: what the set contains. It doubles as the main control on `/predict` and `/experiments`.

### 11.7 Tabs, tooltips, popovers, dialogs
- Tabs: underline style with a sliding champagne indicator (layoutId animation).
- Tooltips: 8 px radius glass, 12 px text, 120 ms delay.
- Dialogs: E3 elevation, backdrop `rgba(5,6,8,0.7)` + blur 8 px, enter scale 0.98 → 1 + fade.
- Command palette (⌘K): glass, grouped results (Pages, Experiments, Models, Actions), recent items, keyboard hints.

### 11.8 Badges, chips, tags
Radius `--r-xs`, 24 px height, 12 px text; variants: neutral, gold (best/selected), semantic, "Preregistered" (champagne outline with check), "Exploratory" (dashed outline), "Sample data" (amber dashed).

### 11.9 Toasts
Bottom-right, glass, hairline border, icon + message + optional action; auto-dismiss 5 s, pause on hover.

### 11.10 Empty, loading, error states
- **Loading:** skeleton shapes matching final layout, champagne shimmer.
- **Empty:** line-art constellation, one-sentence explanation, one primary action.
- **Error:** ruby hairline, human message, retry, error ID in mono.

### 11.11 Evidence footer (required on every chart/table card)
`n = 395 · 5×5 nested CV · Metric: PR-AUC · Dataset v1 · Run e07 · commit a1b2c3d` — small mono caption in `--text-3`, with a "View protocol" link. This makes provenance part of the aesthetic.

---

## 12. Page blueprints

### 12.1 Landing / hero (`/`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  EduInsight AI                         Overview  Experiments  Predict  │
│                                                                        │
│  OVERLINE  EXPLAINABLE LEARNING ANALYTICS                              │
│                                                                        │
│  Evidence, not verdicts.        (display-xl, serif, italic on "not")   │
│                                                                        │
│  A rigorous, reproducible study of early student-risk prediction —     │
│  calibrated, explainable and honest about uncertainty.                 │
│                                                                        │
│  [ Explore experiments ]  [ Try the predictor ]                        │
│                                                                        │
│  ─────────── aperture line ───────────                                 │
│  ┌ KPI ┐ ┌ KPI ┐ ┌ KPI ┐ ┌ KPI ┐   (real values only, else "Pending")  │
│                                                                        │
│  [ Information Ladder preview with animated accumulation curve ]       │
└────────────────────────────────────────────────────────────────────────┘
```

Background: constellation dot-grid + faint blurred beeswarm. Hero headline fades up in 3 staggered lines.

### 12.2 `/overview` — Analytics

- Header: title, dataset switcher (math / Portuguese / both), data scope badge.
- Row 1: 4 KPI cards (students, at-risk share, mean G3, % G3 = 0).
- Row 2: ridgeline distributions (left, 7 cols) + risk-share by subgroup (right, 5 cols).
- Row 3: statistical associations panel — effect-size lollipop chart with FDR-adjusted markers; table below.
- Evidence footer on every card.

### 12.3 `/experiments` — The research instrument

- Left rail: experiment list (E1…E12) with preregistered/exploratory chips.
- Main: **Information Ladder** control + accumulation curve (hero chart, 480 px tall).
- Below: model comparison forest plot, calibration, decision curve, ablation heatmap in a tabbed gallery.
- Right drawer: "Protocol" summary (CV design, seeds, tests, hypotheses with status: Supported / Not supported / Inconclusive).
- **Hypothesis tracker:** H1–H6 cards with the decision rule, result (with CI), status chip.

### 12.4 `/predict` — The consultation room

```
┌───────────────────────┬─────────────────────────────────────────────┐
│ Information Ladder    │  Estimated risk                              │
│ S0 ─ S1 ─ S2 ─ S3 ─ S4│  [ probability gauge ]  [ risk badge ]      │
│                       │  Interval 90%: 0.31 – 0.67  · conformal set  │
│ Inputs (grouped,      │                                             │
│ collapsible):         │  Factors associated with this prediction    │
│  Background           │  [ Waterfall of Evidence ]                  │
│  History              │                                             │
│  Behavior             │  Model context: CatBoost v1.2 · S2 · ECE 0.04│
│  Grades (S3/S4)       │  ┌ Notice ──────────────────────────────┐   │
│                       │  │ Research prototype. Not for decisions │   │
│ [ Estimate risk ]     │  │ about real students.                  │   │
└───────────────────────┴──┴──────────────────────────────────────┴───┘
```

- Input panel groups collapsible with group icons; fields validated against the data dictionary.
- Result area animates: gauge sweeps, waterfall cascades.
- "Copy explanation as text" and "Export PNG" actions.

### 12.5 `/about` — Model card & limitations

Editorial layout: serif headings, 68-char measure, side margin notes (Tufte-style) for caveats. Sections: Intended use · Data scope · Information tiers (with assumption note) · Metrics · Fairness analysis · Limitations · Citation · Preregistration and DOI links. Includes a **"What this tool is not"** panel in a champagne-outlined card.

---

## 13. Content and voice

### 13.1 Tone
Calm, precise, humble. Confident about methods, modest about conclusions.

### 13.2 Required phrasing

| Instead of | Use |
|------------|-----|
| "AI determined the student will fail" | "The model estimates a higher likelihood of a below-pass final grade" |
| "Absence caused poor performance" | "Absences are associated with higher estimated risk in this model" |
| "Accuracy: 91%" | "PR-AUC 0.71 [0.63, 0.78], n = 395, 5×5 nested CV" |
| "High risk student" | "Student with higher estimated risk" |
| "Results prove…" | "Results suggest… under this dataset and protocol" |

### 13.3 Microcopy library
- Empty: *"No experiments match these filters."*
- Pending result: *"Awaiting run. This value will appear once the experiment completes."*
- Sample data: *"Illustrative placeholder — not a result."*
- Disclaimer (persistent): *"Research prototype trained on Portuguese secondary-school data. Not for decisions about real students."*
- Uncertain: *"The interval spans the decision threshold — treat this estimate as inconclusive."*

---

## 14. Accessibility

- WCAG 2.2 AA minimum; AAA for body text where feasible.
- Keyboard: full navigation, visible focus (`2px` champagne ring + glow), logical tab order, skip link, `⌘K` palette with ARIA combobox pattern.
- Charts: every chart has a text summary (`aria-describedby`), a data-table toggle, and keyboard-accessible tooltips (arrow keys move across points).
- No color-only encoding (icons, labels, patterns). Test with deuteranopia/protanopia simulation.
- Targets ≥ 44×44 px on touch. Reduced-motion and reduced-transparency support. Zoom to 200% without loss. Language attribute set; `aria-live="polite"` for prediction results.

---

## 15. Performance budget

| Metric | Target |
|--------|--------|
| LCP | < 2.0 s on mid-range mobile (4G) |
| CLS | < 0.05 |
| INP | < 150 ms |
| JS per route (gzip) | < 180 KB (code-split charts) |
| Fonts | ≤ 3 families, variable, subsetted, `display: swap` |

Tactics: Server Components for static analytics, dynamic import for heavy charts, pre-render results from static JSON, avoid layout shifts with reserved chart heights, GPU-friendly transforms only, cap blur radii, lazy-load beeswarm.

---

## 16. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| ≥1280 | Full shell; two-column result layouts |
| 1024–1279 | Sidebar collapses to icons (72 px); charts reflow |
| 768–1023 | Sidebar becomes drawer; 8-col grid; gauge + waterfall stack |
| <768 | Bottom tab bar (Overview, Experiments, Predict, About); cards single-column; tables become stacked cards; Information Ladder becomes a horizontally scrollable stepper; sliders sized for thumbs |

Charts adapt: fewer ticks, direct labels become a legend, minimum 280 px height.

---

## 17. Implementation

### 17.1 CSS variables (`globals.css`)

```css
:root {
  /* surfaces */
  --bg-0:#07080B; --bg-1:#0B0D12; --bg-2:#10131A; --bg-3:#161A23; --bg-4:#1D222D;
  --line-1:#1F2430; --line-2:#2A3040;
  /* text */
  --text-1:#F3EFE6; --text-2:#B9B4A8; --text-3:#827E74; --text-4:#5B5851;
  /* gold */
  --gold-300:#F1DFB0; --gold-400:#E4C98A; --gold-500:#D4AF6A; --gold-600:#B8924A; --gold-700:#8C6C33;
  --gold-glow: rgba(212,175,106,0.18);
  /* semantic */
  --emerald:#4FB58A; --amber:#E0A84B; --ruby:#D9576B; --sapphire:#6C8BEA;
  /* radii */
  --r-xs:6px; --r-sm:10px; --r-md:14px; --r-lg:20px; --r-xl:28px;
  /* motion */
  --ease-out:cubic-bezier(0.22,1,0.36,1);
  --ease-in-out:cubic-bezier(0.65,0,0.35,1);
  /* effects */
  --grad-aperture: linear-gradient(90deg, transparent, var(--gold-500), transparent);
  --grad-gold: linear-gradient(135deg,#F1DFB0 0%,#D4AF6A 45%,#8C6C33 100%);
  --grad-sheen: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 40%);
}

:root[data-theme="light"] {
  --bg-0:#F7F4EC; --bg-1:#FBF9F3; --bg-2:#FFFFFF; --bg-3:#F1EDE2; --bg-4:#EAE4D4;
  --line-1:#E6E0D0; --line-2:#D8D1BD;
  --text-1:#16130C; --text-2:#4D483C; --text-3:#7C766A; --text-4:#A8A294;
  --gold-500:#9A7430; --gold-400:#B8924A; --gold-glow: rgba(154,116,48,0.18);
}

html { color-scheme: dark; }
body {
  background: var(--bg-0);
  color: var(--text-1);
  font-family: var(--font-sans), system-ui, sans-serif;
  font-feature-settings: "ss01","cv11";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.num { font-family: var(--font-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums lining-nums; }
:focus-visible { outline: 2px solid var(--gold-400); outline-offset: 2px; box-shadow: 0 0 0 4px var(--gold-glow); }
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

### 17.2 Tailwind config (extract)

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { 0: "var(--bg-0)", 1: "var(--bg-1)", 2: "var(--bg-2)", 3: "var(--bg-3)", 4: "var(--bg-4)" },
        line: { 1: "var(--line-1)", 2: "var(--line-2)" },
        ink: { 1: "var(--text-1)", 2: "var(--text-2)", 3: "var(--text-3)", 4: "var(--text-4)" },
        gold: { 300:"#F1DFB0", 400:"#E4C98A", 500:"#D4AF6A", 600:"#B8924A", 700:"#8C6C33" },
        emerald: "var(--emerald)", amber: "var(--amber)", ruby: "var(--ruby)", sapphire: "var(--sapphire)",
      },
      borderRadius: { xs:"6px", sm:"10px", md:"14px", lg:"20px", xl:"28px" },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        e2: "0 8px 24px rgba(0,0,0,0.35)",
        e3: "0 24px 64px rgba(0,0,0,0.5)",
        glow: "0 0 0 4px var(--gold-glow)",
      },
      transitionTimingFunction: { silk: "cubic-bezier(0.22,1,0.36,1)" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        aperture: { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: { shimmer: "shimmer 1.8s infinite", aperture: "aperture .6s var(--ease-out) both" },
    },
  },
} satisfies Config;
```

### 17.3 Fonts (`app/layout.tsx`)

```tsx
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["opsz", "SOFT"] });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### 17.4 Aperture Line component

```tsx
export function ApertureLine({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full origin-center animate-aperture ${className}`}
      style={{ background: "var(--grad-aperture)", opacity: 0.45 }}
    />
  );
}
```

### 17.5 Signature card

```tsx
export function Card({ featured, children }: { featured?: boolean; children: React.ReactNode }) {
  return (
    <section
      className="relative overflow-hidden rounded-md border border-line-1 bg-bg-2 p-6
                 transition-[background,border-color,transform] duration-200 ease-silk
                 hover:-translate-y-0.5 hover:border-gold-700 hover:bg-bg-3"
    >
      {featured && <ApertureLine className="absolute inset-x-0 top-0" />}
      <div aria-hidden className="pointer-events-none absolute inset-0"
           style={{ background: "var(--grad-sheen)" }} />
      <div className="relative">{children}</div>
    </section>
  );
}
```

### 17.6 KPI card with number settle

```tsx
"use client";
import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

export function Metric({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => v.toFixed(decimals));
  useEffect(() => {
    if (reduce) return;
    const c = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className="num font-display text-[2rem] leading-none text-ink-1">{text}</motion.span>;
}
```

### 17.7 Primary button

```tsx
export function GoldButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-sm px-6 text-sm font-semibold
                 text-[#1A1405] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                 transition-all duration-200 ease-silk hover:brightness-110 hover:shadow-glow
                 active:scale-[0.98] disabled:opacity-40"
      style={{ background: "var(--grad-gold)" }}
    />
  );
}
```

### 17.8 Charting setup
- Use **Recharts** for standard charts (line, bar, scatter) styled through the tokens; use **D3 + SVG** for waterfall, beeswarm, gauge, ridgeline, rank-slope.
- Centralize `chartTheme.ts` (colors, gridline opacity, font sizes, tooltip component) and import everywhere.
- Charts receive data from API/static JSON produced by the experiment pipeline; **no hard-coded result numbers** in components.

### 17.9 Suggested folder structure (frontend)

```text
apps/web/
├── app/
│   ├── (marketing)/page.tsx
│   ├── overview/page.tsx
│   ├── experiments/page.tsx
│   ├── predict/page.tsx
│   └── about/page.tsx
├── components/
│   ├── ui/            # shadcn base (button, input, dialog, tabs…) re-skinned to tokens
│   ├── brand/         # Wordmark, Monogram, ApertureLine
│   ├── data/          # KpiCard, EvidenceFooter, RiskBadge, ProbabilityGauge
│   ├── charts/        # AccumulationCurve, ForestPlot, Reliability, Waterfall, Beeswarm…
│   └── layout/        # Shell, Sidebar, Topbar, CommandPalette
├── lib/               # api client, chartTheme, formatters, a11y helpers
├── styles/globals.css
└── tailwind.config.ts
```

### 17.10 Formatting helpers
- Probabilities: `0.49` (2 dp) with `[0.31, 0.67]`. Percentages only for shares ("18% at-risk").
- MAE/RMSE: 2 dp; p-values: `p < 0.001` or 3 dp; CIs always bracketed with a thin space.
- Use `Intl.NumberFormat` and the true minus sign.

---

## 18. QA and review checklist

**Visual**
- [ ] No pure black/white; tokens used, no ad-hoc hex values.
- [ ] Gold covers ≲ 5% of any view and marks meaningful items only.
- [ ] Every card has consistent radius, hairline border and spacing.
- [ ] Typography follows the scale; numerals are tabular.

**Data honesty**
- [ ] Every chart shows n, metric, uncertainty and provenance footer.
- [ ] No placeholder numbers without a `SAMPLE DATA` marker.
- [ ] Language is associative, never causal; disclaimer visible on `/predict`.
- [ ] Small subgroups are greyed out with an explanation.

**Interaction**
- [ ] Hover, focus, pressed, disabled, loading and error states exist for all controls.
- [ ] Animations ≤ 700 ms; reduced-motion honored.
- [ ] Command palette and keyboard navigation work.

**Accessibility**
- [ ] Contrast checks pass; color-blind simulation passes.
- [ ] Charts have text summaries and table alternatives.
- [ ] Touch targets ≥ 44 px; screen-reader labels verified.

**Performance**
- [ ] Lighthouse (mobile) ≥ 90 for Performance, 100 for Accessibility.
- [ ] Charts code-split; fonts subsetted; no layout shift.

---

## 19. Roadmap for design implementation

| Phase | Deliverables |
|-------|--------------|
| **D1 (2 days)** | Tokens in CSS + Tailwind, fonts, app shell, Wordmark/Monogram, ApertureLine, Card, Button, Input |
| **D2 (3 days)** | KPI card, Evidence footer, Risk badge, Tabs, Table, Command palette, skeletons and empty states |
| **D3 (4 days)** | Chart theme; accumulation curve, forest plot, reliability, confusion matrix, ridgelines |
| **D4 (4 days)** | XAI components: probability gauge, Waterfall of Evidence, beeswarm, stability view, Information Ladder |
| **D5 (3 days)** | Pages: landing, overview, experiments, predict, about; responsive pass |
| **D6 (2 days)** | Accessibility audit, performance tuning, light theme, visual QA |

---

## 20. Appendix — quick token reference

```
Canvas        #07080B   Card         #10131A   Raised  #161A23
Hairline      #1F2430   Border-strong #2A3040
Text          #F3EFE6 / #B9B4A8 / #827E74
Champagne     #D4AF6A   (hover #E4C98A · pressed #B8924A · deep #8C6C33)
Emerald       #4FB58A   Amber #E0A84B   Ruby #D9576B   Sapphire #6C8BEA
Radii         6 · 10 · 14 · 20 · 28
Motion        120–180 micro · 240–320 standard · 480–640 emphasis
Fonts         Fraunces (display) · Geist (UI) · Geist Mono (numbers)
```

*Design principle to remember:* **the interface should look expensive because it is precise, not because it is loud.**
