# Handoff: Fieldset — Query Builder + Data Table

## Overview
Fieldset is a portfolio-grade interactive demo: a nested filter/query builder sitting on top of a virtualized data table over 5,000 (toggleable to 50,000) fake B2B companies, fully client-side. It deliberately showcases the edge cases most products get wrong: selection surviving a filter change, saved views pointing at deleted fields, "select on screen" vs "select all matching", and loading/empty/error/no-results states.

## About the Design Files
`Fieldset.dc.html` is a **design reference created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. The task is to **recreate this design in the target codebase's environment** (React + TypeScript recommended if starting fresh) using its established patterns. The prototype's logic is plain React-class-style state; port the data model and behaviors described below, not the file itself. `support.js` is prototype runtime plumbing — ignore it entirely.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-perfectly.

## Screens / Views

### 1. Case-study intro (scrolls above the app)
- Max-width 920px, centered, padding 72/32/60.
- Eyebrow: IBM Plex Mono 11px, uppercase, letter-spacing 0.14em, #4c5fd5, weight 600 — "Case study · Interaction design + build".
- H1 36px/1.15, weight 700, letter-spacing -0.02em: "The hardest control in B2B SaaS, with the edge cases nobody demos."
- Body 15px/1.65 #566179, max-width 640px; sub-note 13px #8b96ad.
- 4 "TRY 01–04" cards: auto-fit grid minmax(240px,1fr), gap 12px; white cards, 1px #e2e7f0 border, radius 14px, padding 16px, shadow `0 1px 3px rgba(28,35,54,0.05)`. Card: mono 11px indigo label, 13.5px/600 title, 12.5px/1.55 #667089 body.
- CTA button: 38px height, #4c5fd5 bg, white text 13.5px/600, radius 10px, shadow `0 2px 8px rgba(76,95,213,0.3)`, anchors to `#demo`.

### 2. App shell (100vh flex column, below intro)
Top-to-bottom: top bar → filter panel → (optional reconciliation banner) → table area → status bar.

#### Top bar (min-height 52px, white, bottom border #e2e7f0, wraps on narrow widths)
- Logo: 22px indigo (#4c5fd5) rounded-6px square with mono "F", + "Fieldset" 15px/700.
- Saved-view chips: 28px height, radius 7px, 12.5px/500. Active: bg #eef0fb, border #c3caf0, text #4c5fd5. Inactive: white bg, #e2e7f0 border, #566179 text. A view with a deleted field shows an amber "!" (#d97706).
- Right side: mono "demo" label; 5k/50k segmented toggle; "break it" button (hover: red text #b91c1c); density segmented S/M/L; "Columns ▾" button opening a dropdown (236px, radius 10px, shadow `0 8px 28px rgba(35,41,54,0.12)`) with checkbox show/hide + ↑↓ reorder per column.
- Segmented controls: 26px height buttons, active = #232936 bg/white text, inactive = white bg/#667089 text, 1px #e2e7f0 dividers, end buttons rounded 6px.

#### Filter panel (white, padding 12px 16px 14px)
- Match count line: mono 19px/600 count, "of N match" 12.5px #667089, amber note when conditions are ignored ("N conditions ignored (deleted field)"), right-aligned "Save as view" button (bg #f4f5fc, border #dcdfef, text #4c5fd5 12.5px/600) which swaps to inline name input + Save/Cancel.
- Condition rows (vertical stack, gap 7px):
  - Leading 44px slot: "Where" (12px #8b96ad) on first row; AND/OR joiner pill on subsequent rows — 44×26px, bg #f4f5fc, border #dcdfef, text #4c5fd5, mono 10.5px/600, **click toggles the root group op**.
  - Condition box: inline-flex, wrap, padding 4px 6px, border 1px #ebebef, bg #fdfdfe, radius 8px. Contains: field select → operator select → value input(s) → per-condition live hit count (mono 11px #aab3c5, "1,234 hits") → × remove (hover red).
  - Inputs: 26px height, radius 6px, border #e2e7f0, bg #fafbfd; numeric/date inputs use IBM Plex Mono.
- Group rows: box with 1px #e2e7f0 border + **3px left border #c3caf0**, bg #f9fafd, radius 8px, padding 8px 10px. Header: mono uppercase "group · match" + ALL(AND)/ANY(OR) toggle pill + × remove. Children are smaller condition rows (24px inputs) with mono joiner labels; "+ condition" link-button at bottom.
- Footer: "+ Condition" and "+ Group ( OR )" dashed-border buttons (#c8d0e0 dashed, indigo text, hover fills #f7f8fd).
- Deleted-field condition: box turns amber (border #ecd9b8, bg #fdf8ee), text "field was deleted — condition ignored" #b45309 + remove button; the condition is skipped in evaluation (treated as absent, NOT false).

#### Reconciliation banner (appears between filter and table)
Amber strip: bg #fdf6ea, border-bottom #f0dfc0, text #7c5410 12.5px. Mono "SELECTION" tag on #f5e6c8. Copy: "You selected all N rows matching the previous filter. The filter changed — M of them still match." Actions: "Keep all N" (outline), "Trim to M matching" (solid #7c5410), "Clear selection" (ghost).

#### Table
- Sticky header row 34px, bg #f7f9fc, 12px/600 #566179 labels; sticky first two columns (40px checkbox col, then Company col, default 220px) with stronger right border #e2e7f0.
- Header cells: click = single sort (asc→desc→none), **shift-click = append multi-sort**; sort glyph ↑/↓ + priority number in indigo mono; drag to reorder; 7px right-edge handle for col resize (min 70px).
- Rows: heights 32/40/50px for Compact/Comfortable/Spacious; zebra #f8fafc on odd rows; hover #f4f5fa; selected bg #eef0fb; bottom border #f0f3f8.
- Cells: 12.5px; numeric/date columns IBM Plex Mono 12px #46516b, right-aligned numerics. CRM column is a badge: "In CRM" = bg #e7f4ec text #1d7a45; "—" = bg #f0f3f8 text #8b96ad; 11px/600, radius 5px, padding 2px 7px.
- **Virtualization**: fixed row height per density; render window = visible range ± overscan (5 above, ~12 below) between top/bottom spacer divs; scroll handler throttled via requestAnimationFrame.
- Header checkbox selects/deselects **only the rendered window rows** ("the 50 on screen") — intentionally distinct from "select all matching" in the bulk bar.
- Row selection: checkbox click toggles; **shift-click selects the range from the last anchor index**, applying the target row's new state to the whole range.
- Bulk action bar: floating pill bottom-center, bg #232936 (near-black), white text, radius 11px, shadow `0 10px 30px rgba(35,41,54,0.3)`. Shows mono "N selected", "Select all N matching" (indigo-tinted ghost, only when a partial selection exists), "Add to CRM" (solid indigo), "Export CSV" (outline), ×.
- States: loading = header stub + 14 shimmer skeleton rows (keyframes `shimmer`, 1.3s linear) + mono "loading N companies…"; error = centered "!" tile #fbf1f1/#b91c1c, "Couldn't load companies", mono "GET /api/companies → 503", dark Retry button; no-results = dashed "0" tile, "No companies match this filter", "Clear filters" CTA.
- Toast: top-center white pill, border #e2e7f0, radius 9px, shadow, auto-dismiss 2.6s.

#### Status bar (28px, bg #f7f9fc, top border)
IBM Plex Mono 10.5px #8b96ad: "N rows · virtualized", "sort: revenue desc", right: "fieldset — a filter & table edge-case study".

## Interactions & Behavior

### Filter model
```
Group = { op: 'AND'|'OR', children: (Cond|Group)[] }   // root is a Group; nesting is 1 level deep in UI (root + groups)
Cond  = { field, op, value, value2? }                   // value is string[] for any_of/not_any_of
```
- Empty group ⇒ matches everything. Condition with empty value ⇒ matches everything (no flicker while typing).
- Condition on a **deleted/unknown field ⇒ returns null and is excluded** from the group aggregation (not treated as false). Count of ignored conditions surfaces next to the match count.
- Operators by field type:
  - text: contains, is, is not, starts with, is empty
  - number: more than, less than, equals, between (two inputs)
  - enum: is, is not, **is any of, is not any of** (multi-select value chips: 24px pills, selected = #eef0fb bg/#c3caf0 border/#4c5fd5 text/600; empty selection matches all)
  - date: in last 30 days, in last 90 days, before, after, between
  - boolean: is true, is false
- Changing field resets op to the type's first op and clears/re-seeds value. Switching to/from any_of wraps/unwraps value between string and array.
- Live match count re-computes on every keystroke; per-condition hit counts computed against the full dataset.
- Editing anything deselects the active view chip (view = named snapshot of the tree; switching views replaces the tree via deep clone, never mutates the saved copy). "Save as view" appends a new named view and activates it.
- Seeded views: All companies (empty), ICP · Mid-market SaaS (`industry is SaaS AND (headcount > 200 OR revenue > 5) AND inCRM is false`), Not in CRM active, and **EMEA legacy** — intentionally referencing a deleted field `region_emea` to demo the degradation path.

### Selection reconciliation (the flagship edge case)
- Two selection modes: `ids` (explicit set) and `all` (snapshot of every id matching the filter at the moment "Select all matching" was clicked, plus its count).
- When mode is `all` and the filtered count changes: show the reconciliation banner, hide the bulk bar until resolved. Keep = dismiss for this filter state (dismissal keyed to the filter signature, re-triggers if filter changes again); Trim = intersect snapshot with current matches and drop to `ids` mode; Clear = empty selection.
- Any manual row toggle while in `all` mode materializes the snapshot into explicit ids first, then applies the toggle, and returns to `ids` mode.

### Sorting
Multi-sort array `[{key, dir}]`; comparator walks sorts in order, localeCompare for strings, id as final tiebreak; glyph shows direction + 1-based priority when >1 sort.

### Data
Deterministic PRNG (seeded, mulberry32-style) generates companies: two-word names from curated word lists, industry/stage/country enums, log-distributed headcount and revenue, founded 1995–2025, lastActivity within 240 days, inCRM ~42%. 5k default; 50k stress toggle regenerates (simulated 0.7–1.1s load with skeleton). "break it" forces the error state; Retry reloads.

## State Management
`phase` (loading|ready|error), `dataN`, `tree`, `views[]`, `activeView`, `sorts[]`, `colOrder[]`, `hidden{}`, `widths{}`, `nameW`, `selIds{}`, `selMode`, `snapCount`, `anchor`, `reconDismissKey`, `scrollTop`, `viewH`, `density`, plus UI bits (colMenuOpen, savingView, saveName, toast). Filter and sort results are memoized on (dataVersion, tree JSON) and (filterKey, sorts JSON) keys.

## Design Tokens
- Accent: #4c5fd5 (hover dark #3a49b0); accent tints #eef0fb, #f4f5fc, #f7f8fd; accent borders #c3caf0, #dcdfef; on-dark accent #a5b0f0.
- Ink: #232936 (primary), #46516b, #566179, #667089, #8b96ad, #aab3c5.
- Surfaces: page #eef1f6, panels #fff, header/status #f7f9fc, zebra #f8fafc, group #f9fafd, inputs #fafbfd.
- Borders: #e2e7f0 (strong), #e9edf4, #f0f3f8 (row), dashed #c8d0e0.
- Amber (degraded): text #b45309/#7c5410/#d97706, bg #fdf8ee/#fdf6ea/#f5e6c8, border #ecd9b8/#f0dfc0/#e2cf9f.
- Green (CRM badge): #e7f4ec / #1d7a45. Red (error): #fbf1f1 / #b91c1c.
- Dark: #232936 bg, #414d66 border, #2e374a hover.
- Type: Instrument Sans (UI) + IBM Plex Mono (numbers, dates, counts, meta). Base 13px; table 12.5px; headers 12px/600; mono meta 10.5–11px.
- Radii: 5–8px controls, 10–14px surfaces; chips fully rounded.
- Row heights: 32 / 40 / 50. Control heights: 22 / 24 / 26 / 28 / 38.

## Assets
None — no images or icon fonts. Glyphs are text characters (↑ ↓ × ▾ !). Fonts loaded from Google Fonts (Instrument Sans, IBM Plex Mono).

## Files
- `Fieldset.dc.html` — the full prototype: markup/styles in the `<x-dc>` template, all behavior in the `Component` class within the same file. This is the single source of truth for both visuals and logic.
