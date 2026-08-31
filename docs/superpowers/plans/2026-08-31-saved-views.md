# Saved view management — plan

**Goal:** Turn saved views from throwaway snapshots into things you can keep:
update, rename, delete, pin, and edit without losing your work.

**Today:** a view is a snapshot you switch to. Editing anything detaches it —
`activeView` goes null and your edits belong to nothing. You can create views and
nothing else.

---

## The model change

This is the part that matters. Everything else is buttons.

A view stops being a snapshot and becomes a **document with an unsaved state**.

- **Edits are kept per view.** Edit ICP, switch to another view, come back — your
  edits are still there. That needs somewhere to put them, so:
  `drafts: Record<viewId, Group>`.
- **Dirty** means a draft exists for the active view. The chip shows it.
- **Switching views** stores the working tree as the outgoing view's draft, then
  loads the incoming view's draft if it has one, otherwise its saved tree.
- **Save** writes the draft onto the view and clears it.
- **Discard** clears the draft and reloads the saved tree.
- `activeView` stays set while editing. It only goes null if the active view is
  deleted.

Drafts are in-memory only. They do not join `railWidth` in localStorage — a
half-finished filter surviving a reload is a surprise, not a feature.

## Decisions

1. **Keep edits when navigating away.** Chosen explicitly. Implies the drafts map;
   the simpler "reset on switch" model was rejected.
2. **Discard is an explicit action,** since edits now persist. Without it there is
   no way back to the saved version.
3. **Save vs Save as…** — `Save` updates the active view in place and is disabled
   when there is nothing to save. `Save as…` always creates a new view. On an
   empty filter neither appears, matching what already ships.
4. **Pinned views sit in the top bar; the rest live in a dropdown.** Pinned is a
   flag on the view. The dropdown lists everything, pinned or not.
5. **Seeded views are ordinary views.** They can be edited, renamed, deleted and
   unpinned. Deleting "EMEA legacy" removes the deleted-field demonstration —
   accepted, because a demo that cannot be broken is not much of a demo.
6. **Deleting the active view** clears `activeView`, drops its draft, and leaves
   the working tree exactly as it is. Your filter does not change under you just
   because its label went away.

7. **Deleting a view asks first.** Decided by the owner over an undo toast. The
   confirm names the view being deleted, so it is a real check rather than a
   reflex click, and it defaults to cancel. Deleting is the only destructive
   action in the app; nothing else needs this treatment.

---

## Phase 1 — State

**Files:** `src/domain/types.ts`, `src/domain/tree.ts`, `src/state/reducer.ts`, tests

- `SavedView` gains `pinned: boolean`.
- `AppState` gains `drafts: Record<string, Group>`.
- Actions: `view/save` (update in place), `view/saveAs`, `view/discard`,
  `view/delete`, `view/rename`, `view/togglePin`.
- `view/select` stores the outgoing draft before loading the incoming view.
- Seed the four existing views with `pinned: true` so today's top bar is unchanged.
- A `isViewDirty(state)` helper, used by the chip and to disable Save.

**Tests, all pure:** edit → switch away → switch back keeps the edits; Save clears
the draft and updates the view; Discard restores the saved tree; deleting the
active view clears `activeView` but leaves the tree; deleting a non-active view
leaves everything else alone; renaming does not touch the tree; pin/unpin; and a
draft on a view that is then deleted does not linger in the map.

## Phase 2 — Panel actions

**Files:** `src/components/FilterPanel/MatchCount.tsx`, `SaveViewInline.tsx`, CSS

- `Save` (in place, disabled when clean), `Save as…`, `Discard`.
- All three hide on an empty filter, matching the current behaviour.
- Space is tight in a 500px rail: if the three do not fit beside the match count,
  they move to their own row beneath it rather than wrapping raggedly.

## Phase 3 — Top bar

**Files:** `src/components/TopBar/ViewChips.tsx`, new `ViewMenu.tsx`, CSS

- Pinned views render as chips, as now. The dirty one shows an indicator.
- A `Views ▾` dropdown lists every view with pin, rename and delete per row,
  following the existing `ColumnsMenu` pattern rather than inventing a new one.
- The dropdown is the only place unpinned views can be reached, so it is not
  optional chrome.

## Phase 4 — Close out

Retake the portfolio screenshot and update the Webflow asset. Deferred from the
rail plan for exactly this reason.

---

## Definition of done

- All gates pass.
- Every transition in "The model change" has a test.
- Deleting the active view does not change the visible rows.
- The top bar still reads correctly with one view and with fifty.
- Panel actions fit at a 300px rail without ragged wrapping.
