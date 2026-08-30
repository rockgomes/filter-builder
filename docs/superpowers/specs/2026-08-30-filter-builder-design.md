# Fieldset — Design Spec

**Date:** 2026-08-30
**Repo:** `rockgomes/filter-builder`
**Source of truth:** `design_handoff_fieldset/README.md` + `design_handoff_fieldset/Fieldset.dc.html`

## 1. Purpose

Port the Fieldset design handoff into a production React + TypeScript codebase. Fieldset is a
nested filter/query builder over a virtualized table of synthetic B2B companies, entirely
client-side. Its reason to exist is the edge cases most products get wrong:

1. Selection that survives a filter change (reconciliation).
2. A saved view referencing a deleted field, degraded rather than broken.
3. "Select the rows on screen" kept distinct from "select all matching".
4. 50,000 rows staying smooth without pagination.

**Fidelity is high.** Colors, typography, spacing and interactions in the handoff are final and
recreated exactly. Where this spec departs from the prototype it is for logic defects or
accessibility, never for visual taste. Every such departure is listed in section 8 and 9.

## 2. Scope

### In scope
The Fieldset application shell only: top bar, filter panel, reconciliation banner, virtualized
table, bulk action bar, status bar, and the loading / error / empty states.

### Out of scope
The case-study intro section (screen 1 of the handoff — eyebrow, H1, TRY 01-04 cards, CTA) is
**not built**. That narration lives on the author's portfolio site instead.

Consequences, accepted deliberately:

- The app is the entire page. Root fills `100dvh` with no surrounding page chrome, so it works
  both as a standalone URL and embedded in an iframe from the portfolio.
- The `#demo` anchor and the "Jump to the demo" CTA are dropped.
- The TRY 01-04 cards were the only in-product signposts telling a visitor which edge cases to
  try. Without them the demo does not explain itself; the portfolio copy carries that job.

### Non-goals
No backend, no persistence across reloads, no auth, no real CSV download (the export action
raises a toast, as in the prototype), no routing.

## 3. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite | Fast, static output, trivial Netlify deploy |
| UI | React 19 + TypeScript (strict) | Recommended by the handoff |
| Styling | CSS Modules over `tokens.css` custom properties | Production shape; token values lifted verbatim from the handoff so fidelity cannot drift |
| State | Single `useReducer` with a typed action union | Makes selection reconciliation an explicit, pure, testable state machine |
| Tests | Vitest + React Testing Library + jsdom | Logic tested as plain functions; components tested at the interaction level |
| Lint/format | ESLint (typescript-eslint) + Prettier | |
| CI | GitHub Actions: typecheck, lint, test, build | |
| Deploy | Netlify | Per-PR previews, static build |

Dynamic values that cannot be static CSS (row heights per density, column widths, virtualization
spacer heights, drag offsets) stay as inline `style` props. Everything else is a CSS Module class.

## 4. Module architecture

```
src/
  domain/                  pure, zero React, 100% unit tested
    types.ts               Company, Field, FieldType, Cond, Group, Node, SortSpec, Density, Phase
    fields.ts              FIELDS, OPS (by type), COLS
    generateCompanies.ts   seeded mulberry32 generator
    filter.ts              evalCond, evalGroup, filterRows, countIgnored, conditionHits
    sort.ts                buildComparator, sortRows
    tree.ts                immutable find / patch / insert / remove / walk / cloneTree
    selection.ts           selection state machine + reconciliation
    format.ts              formatNumber, formatDate
  state/
    reducer.ts             pure reducer + action union
    useFieldset.ts         reducer + memo pipeline + load effect
  hooks/
    useVirtualWindow.ts    rAF-throttled scroll -> {start, end, topPad, botPad}
    useColumnResize.ts     pointer-driven width drag, min 70px
    useColumnDrag.ts       HTML5 drag reorder
  components/
    App.tsx
    TopBar/                Logo, ViewChips, SegmentedControl, ColumnsMenu
    FilterPanel/           MatchCount, ConditionRow, GroupRow, ValueEditor, EnumChips, SaveViewInline
    ReconciliationBanner/
    Table/                 TableHeader, VirtualBody, TableRow, TableCell, CrmBadge,
                           LoadingState, ErrorState, EmptyState
    BulkBar/
    StatusBar/
    Toast/
  styles/
    tokens.css             every token from handoff section "Design Tokens"
    global.css             resets, fonts, scrollbar, keyframes
```

Each domain module has one purpose and is usable without React. A component file that grows past
roughly 200 lines is a signal to split it.

## 5. Data model

```ts
type Group = { kind: 'group'; id: string; op: 'AND' | 'OR'; children: Node[] }
type Cond  = { kind: 'cond';  id: string; field: string; op: string;
               value: string | string[]; value2: string }
type Node  = Group | Cond
```

The root is a `Group`. The model is recursive; the UI exposes exactly one level of nesting
(root plus groups), matching the handoff.

**Fields:** name/owner (text), industry/stage/country (enum), headcount/revenue (number),
founded/lastActivity (date), inCRM (boolean).

**Operators by type:** text `contains, is, is_not, starts, empty`; number `gt, lt, eq, between`;
enum `is, is_not, any_of, not_any_of`; date `last30, last90, before, after, between`;
boolean `true, false`.

**Data generation** is deterministic: seed 42, mulberry32 PRNG, two-word names from curated
prefix/suffix lists, log-distributed headcount and revenue, founded 1995-2025, lastActivity
within 240 days, `inCRM` at ~42%.

## 6. Evaluation semantics

These three rules are the heart of the project and are specified precisely because tests assert
them directly:

1. **A condition on an unknown field returns `null`.** `null` results are *excluded* from group
   aggregation — the condition behaves as absent, never as `false`. A view referencing a deleted
   field still returns rows. The count of ignored conditions surfaces beside the match count.
2. **An empty value matches everything.** This prevents the result set flickering to zero while a
   user types. An `any_of` with an empty array likewise matches everything.
3. **An empty group matches everything.** With no non-null child results, a group returns `true`.

Aggregation: `AND` requires every non-null child true; `OR` requires at least one.

## 7. Selection state machine

Two modes:

- `ids` — an explicit set of selected row ids.
- `all` — a snapshot `Set` of every id matching the filter at the instant "Select all N matching"
  was pressed, plus `snapCount`, the match count at that instant.

Transitions:

| Event | Result |
|---|---|
| Row toggle while in `all` | Snapshot materializes into explicit ids, then the toggle applies; mode becomes `ids` |
| Shift-click row | Range from the last anchor to the clicked index; the **target row's new state** is applied across the whole range |
| Header checkbox | Toggles **only the currently rendered window rows**; never the full matching set |
| "Select all N matching" | Offered only when a partial selection exists in `ids` mode; enters `all` mode |
| Filter changes while in `all` and `filteredCount !== snapCount` | Reconciliation banner appears; bulk bar hides until resolved |
| Banner "Keep all N" | Dismissal recorded against the current filter signature; re-arms if the filter changes again |
| Banner "Trim to M matching" | Snapshot intersected with current matches; drops to `ids` mode |
| Banner "Clear selection" | Selection emptied |

## 8. Prototype defects corrected in the port

Logic only. No visual consequence.

1. `setRows5k` / `setRows50k` assign `this.state.dataN` directly and additionally call
   `setState` two or three times in succession (`Fieldset.dc.html:808-809`). Ported as a single
   action plus a load effect.
2. `_cache.snapSet` is constructed during render as a mutable side-channel. Unsound under
   concurrent rendering. The snapshot becomes explicit reducer state.
3. `isSel` in all-mode evaluates `sel[id] !== false && snapSet.has(id)`; the first clause is
   dead. Collapses to a set membership check.
4. Per-condition hit counts scan the entire dataset on every render, unmemoized — at 50k rows
   times N conditions this is the port's one real performance hazard. Memoized on
   `(dataVersion, condition signature)`.

## 9. Accessibility additions

The prototype has none. These are additive; no pixel changes.

- `aria-sort` on sortable column headers, with real `<button>` semantics for the sort affordance.
- Accessible names on every checkbox (row checkboxes name their company).
- `:focus-visible` rings reusing the existing `#c3caf0` outline token already present on inputs.
- `prefers-reduced-motion` fallback for the `shimmer` skeleton keyframes: static tint, no animation.
- Verified before merge: contrast, no horizontal scroll between 320px and 1920px, and the
  presence of focus / disabled / loading states on interactive elements.

## 10. Performance

- Fixed row height per density, so the virtual window is arithmetic, not measurement.
- Render window = visible range minus 5 rows above, plus ~12 below, between two spacer divs.
- Scroll handler throttled through `requestAnimationFrame`.
- Filter memoized on `(dataVersion, tree)`; sort memoized on `(filterKey, sorts)`.
- Target: 50,000 rows scrolling without dropped frames on a mid-range laptop.

## 11. Error handling

- `phase: 'loading' | 'ready' | 'error'`, mirroring the prototype.
- Data generation is simulated as async (700-1100ms) with a skeleton, so loading is a real state
  rather than a decoration.
- "break it" forces `error`; Retry re-runs the load.
- No-results is a distinct state from empty data, with a "Clear filters" action.
- The domain layer has no I/O and therefore no failure modes; it is total over its input types.

## 12. Testing strategy

**Domain, test-first:**

- `filter` — the three semantics of section 6, plus every operator in every family.
- `tree` — immutability of source, nested find/patch/remove, deep clone on view switch.
- `sort` — multi-sort priority order, `localeCompare` for strings, id as final tiebreak.
- `selection` — every transition in the table in section 7, particularly Keep re-arming on a
  second filter change.
- `generateCompanies` — determinism for a fixed seed; value ranges within bounds.

**Components (React Testing Library):**

- Filter panel: add/remove condition, changing field resets the operator and re-seeds the value,
  switching to `any_of` wraps the value into an array and back, a deleted-field row renders amber
  and is excluded from the match count.
- Table: shift-click selects a range, header checkbox affects only rendered rows.
- Reconciliation banner: each of the three actions produces the specified selection state.

## 13. Delivery

Trunk-based on `main`, feature branches, pull requests, squash merge, Conventional Commits.
CI runs typecheck, lint, test and build on Node 24 for every PR and for `main`.

Sequence:

1. Scaffold, tooling, CI, tokens.
2. Domain layer with its tests.
3. App shell: layout, top bar, status bar.
4. Filter panel.
5. Table with virtualization, sorting, column resize and reorder.
6. Selection, reconciliation, bulk bar, and the loading / error / empty states.
7. Netlify deploy.

`design_handoff_fieldset/` remains committed as the reference.
