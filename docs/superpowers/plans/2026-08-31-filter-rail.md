# Filter rail — plan

**Goal:** Move the filter panel from a full-width band above the table into a
resizable left rail, so the table gets the horizontal space currently wasted on
the right of the panel.

**Origin:** At 1440px the panel's content stops around the halfway mark, leaving
roughly 700×430 empty. Four options were mocked; the rail (idea 4) was chosen.

**Not in this work:** the control-outline contrast question (still deferred), and
removing the per-condition hit counts (raised as a possible later simplification —
if that happens it frees ~70px per row and makes the rail narrower, so do not
design around the hit counts being permanent).

---

## Measurements this plan is built on

Taken from the live app, not estimated. Native `<select>` sizes to its **widest
option**, not the selected one — that is why the row does not reflow when a value
changes, and it stays that way.

| Select | Sized to | Width |
|---|---|---|
| Field | "Last activity" | 128px |
| Operator | "is not any of" | 104px |
| Value | "Cybersecurity" | 117px |

Three selects = 349px before gaps, padding, hit count and remove button.
A complete condition row is **~430px**.

**Therefore:** the content needs ~430px, and the panel adds 16px of padding each
side, so the rail must be **490px** for a plain condition to stay on one line.
Measured on the Phase 1 build: 450 wrapped, because the first estimate sized the
rail to its content and ignored the panel's own padding.

## Decisions

1. **Default rail width 450px.** Min 300, max 680. (Was 490 while hit counts were
   always shown; hiding them by default freed ~70px per row.)
2. **Rail applies above 1100px only.** Below that, today's stacked layout is
   unchanged. The rail therefore never has to survive 320px — the narrow-width
   bugs that bit three times already cannot recur here.
3. **Width is draggable** via a handle between rail and table.
4. **Width persists in localStorage.** First persistence in the project; keyed
   and guarded so a missing or corrupt value falls back to 450.
5. **Conditions wrap naturally.** The condition box already has `flex-wrap: wrap`.
   No forced stacking — a row stays on one line when it fits, breaks when it does
   not. This is less work than restacking, not more.
6. **The reconciliation banner moves into the table column,** not full width. It
   is about the table's selection, so it should not span the rail.

---

## Phase 1 — Layout shell

**Files:** `src/App.tsx`, `src/App.module.css`, `src/components/Table/Table.module.css`

`App.tsx` is currently a flat flex column: TopBar → FilterPanel → Banner → Table →
StatusBar. Wrap the middle three in a row container.

```
.app (column)
  TopBar
  .body (row, flex 1)
    FilterPanel   ← rail, fixed width, own vertical scroll
    .main (column, flex 1)
      Banner
      Table
  StatusBar
```

Above 1100px the rail is `flex: none` at its width with `overflow-y: auto`.
Below 1100px `.body` reverts to `flex-direction: column` and the rail to
`width: auto`, reproducing today's layout exactly.

Rail width is set at this stage as a CSS custom property on `.body`, so Phase 2
only has to change the value.

**Verify:** virtualization geometry still exact; sticky header still sticks;
sticky checkbox and Company columns still stick while scrolling horizontally; no
horizontal page scroll at 320, 375, 768, 1024, 1100, 1440, 1920; desktop layout
below 1100px pixel-identical to before.

**Risk:** the table's ResizeObserver now sees width changes as well as height. It
measures its own container so this should be fine, but confirm no feedback loop.

## Phase 2 — Draggable width

**Files:** `src/hooks/useRailResize.ts` (new), `src/state/reducer.ts`, `src/App.tsx`,
`src/App.module.css`

`useColumnResize` already does this exact job for table columns — pointer down,
track deltas on `window`, clamp, dispatch, clean up on unmount. Mirror it.

- New state `railWidth: number`, new action `rail/resize`, clamped 300–680 in the
  reducer (the clamp lives in the reducer, matching how column widths work; do not
  duplicate it in the hook).
- Handle is 7px, `cursor: col-resize`, `preventDefault` + `stopPropagation`.
- Keyboard accessible: focusable separator with `role="separator"`,
  `aria-orientation="vertical"`, arrow keys nudge by 16px. The mouse-only version
  would be the only unreachable control in the app.
- Persist to `localStorage` on change, read on init, fall back to 490 if absent or
  unparseable. Wrap reads in try/catch — private browsing throws.

**Verify:** drag changes width and stops at both clamps; a complete drag leaves no
listeners attached; unmount mid-drag leaves none either; dragging does not trigger
a sort or a selection; width survives reload; arrow keys work.

## Phase 3 — The panel at rail width

**Files:** `src/components/FilterPanel/*.module.css`, `ConditionRow.tsx`, `GroupRow.tsx`

- The AND/OR joiner currently sits in a 44px leading slot. In a rail that is width
  the conditions need. It becomes a small pill *between* rows instead. It keeps
  its click-to-toggle behaviour and its accessible name.
- The remove × moves to the top-right of the condition box rather than trailing
  the row, so it does not get orphaned onto its own line when a row wraps.
- Group rows: the group keeps its 3px left border and indent. Nested conditions
  use the existing `small` variant. Verify a group is usable at 300px, since that
  is the tightest the user can drag to.
- Match count and "Save as view" stack rather than sitting on one line.

**Verify each condition type at 300 / 490 / 680:** text, number, number with
`between` (two inputs), enum single, enum `any_of` (chips), boolean, date, and a
deleted-field condition. Then the same set nested inside a group.

## Phase 4 — Close out (DEFERRED)

Retaking the portfolio screenshot is deferred until saved-view management lands.
That work changes the top bar and the panel header, so a screenshot taken now
would be stale before it was published.

---

## Definition of done

- `npm run typecheck && lint && test && build` all pass.
- Every condition type verified at 300 / 490 / 680, and nested in a group.
- No horizontal page scroll at any width from 320 to 1920.
- Below 1100px the layout is unchanged from today.
- Rail width persists across reload and survives a corrupt stored value.
- Drag leaks no listeners, and the handle is keyboard operable.
