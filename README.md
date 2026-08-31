# Fieldset

Fieldset is a portfolio-grade interactive case study: a nested filter/query builder sitting on
top of a virtualized data table over thousands of synthetic B2B companies, entirely client-side.
It exists to demonstrate the edge cases most filter-and-table products get wrong — this repo
ports that design handoff into a production React + TypeScript codebase.

## The edge cases

1. **Selection survives a filter change.** Rows selected under one filter don't silently vanish
   or silently stay selected when the filter changes — Fieldset reconciles the selection and asks
   the user what to do with rows that no longer match.
2. **A saved view can reference a deleted field.** Rather than breaking, the view degrades: the
   dead condition is treated as absent (not false) and surfaced with a clear amber warning instead
   of silently corrupting results.
3. **"Select the rows on screen" is not "select all matching."** The header checkbox and the bulk
   action bar keep these two very different operations distinct, on tables of up to 50,000 rows.

See `docs/superpowers/specs/2026-08-30-filter-builder-design.md` for the full design spec,
`docs/superpowers/plans/2026-08-30-filter-builder.md` for the implementation plan, and
`design_handoff_fieldset/` for the original high-fidelity design reference (colors, typography,
spacing, and interactions there are final — this app recreates them pixel-for-pixel). The project
was built test-first from these committed documents; 183 tests currently pass across the suite.

Repository: https://github.com/rockgomes/filter-builder

## Live demo

**https://fieldset-filter-builder.netlify.app**

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Script                 | Description                                          |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server.                             |
| `npm run build`         | Type-check the project and build for production.      |
| `npm run preview`       | Preview the production build locally.                  |
| `npm run typecheck`     | Type-check without emitting.                            |
| `npm run lint`          | Run ESLint over the project.                            |
| `npm run format`        | Format the project with Prettier.                       |
| `npm run test`          | Run the test suite once.                                 |
| `npm run test:watch`    | Run the test suite in watch mode.                        |

## Embedding

The app root sizes to `height: 100%` of its container rather than `100vh`, so it is safe to embed
in an iframe:

```html
<iframe
  src="https://fieldset-filter-builder.netlify.app"
  style="width: 100%; height: 700px; border: 0"
></iframe>
```

The app sizes to its container, so it fills the frame at whatever height you give it. `netlify.toml`
deliberately omits `X-Frame-Options` for this reason — a blanket `DENY` would break the embed. If
a Content-Security-Policy is added later it must use `frame-ancestors` with the embedding origin
allowed, not a blanket frame denial.

## Accessibility

Known, deliberate gap: the design handoff's `--ink-5` token (`#8b96ad`) does not meet WCAG AA for
small text. It measures roughly 2.82:1 against the status bar background and 2.97:1 against white,
short of the 4.5:1 requirement for normal-weight body text. The token is left unchanged here
because the color palette is fixed by the design handoff (`design_handoff_fieldset/`); adjusting
it is a pending decision for the project owner, not something this implementation should decide
unilaterally.
