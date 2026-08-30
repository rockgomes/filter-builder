# Fieldset Filter Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side nested query builder over a virtualized table of 5,000–50,000 synthetic companies, reproducing the Fieldset handoff pixel-for-pixel while making its three headline edge cases correct and tested.

**Architecture:** All meaningful logic — filter evaluation, sorting, tree mutation, selection reconciliation — lives in `src/domain/` as pure functions with zero React imports, tested as plain function calls. A single `useReducer` with a typed action union owns app state; components are thin renderers over derived, memoized data. Styling is CSS Modules over a `tokens.css` custom-property layer whose values are copied verbatim from the handoff.

**Tech Stack:** Vite, React 19, TypeScript (strict), CSS Modules, Vitest, React Testing Library, ESLint, Prettier, GitHub Actions, Netlify.

**Spec:** `docs/superpowers/specs/2026-08-30-filter-builder-design.md`

## Global Constraints

- Node 24. Package manager: npm.
- TypeScript `strict: true`. No `any` in `src/domain/`.
- `src/domain/**` must not import React. Enforced by an ESLint `no-restricted-imports` rule.
- Time is always injected, never read ambiently: every function whose behavior depends on the
  current time takes a `now: number` parameter. `Date.now()` appears only in `state/` and
  `components/`.
- Deterministic data: seed `42`, mulberry32 PRNG.
- Row heights are exactly 32 / 40 / 50 px for Compact / Comfortable / Spacious. Default `Compact`.
- Virtual window overscan: exactly 5 rows above, 12 below.
- Column resize minimum width: 70px.
- Toast auto-dismiss: 2600ms. Load simulation: 700ms for 5k, 1100ms for 50k, 900ms initial and on retry.
- Fonts: Instrument Sans (UI), IBM Plex Mono (numbers, dates, counts, meta), from Google Fonts.
- Conventional Commits. Every task ends with a commit.
- The app root sizes to `height: 100%` of its container, never `100vh` inside components.
- No `X-Frame-Options: DENY` in any Netlify config.

---

### Task 1: Project scaffold, tokens, tooling, CI

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `eslint.config.js`, `.prettierrc`, `vitest.setup.ts`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a running dev server, `npm run typecheck | lint | test | build`, and the complete
  design-token layer every later task depends on.

- [ ] **Step 1: Scaffold Vite + React + TS**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the non-empty directory, choose to ignore existing files and continue.
Then remove the template's demo assets:

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom prettier eslint-config-prettier
```

- [ ] **Step 3: Configure Vitest**

Replace `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Add the domain purity ESLint rule**

Append to the config array in `eslint.config.js`:

```js
{
  files: ['src/domain/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'react', message: 'src/domain must stay free of React.' },
        { name: 'react-dom', message: 'src/domain must stay free of React.' },
      ],
    }],
  },
},
```

Create `.prettierrc`:

```json
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

- [ ] **Step 6: Write the design tokens**

Create `src/styles/tokens.css`. Values are copied verbatim from the handoff's Design Tokens
section — do not adjust, round, or "improve" any of them:

```css
:root {
  /* Accent */
  --accent: #4c5fd5;
  --accent-hover: #3a49b0;
  --accent-tint-1: #eef0fb;
  --accent-tint-2: #f4f5fc;
  --accent-tint-3: #f7f8fd;
  --accent-border: #c3caf0;
  --accent-border-soft: #dcdfef;
  --accent-on-dark: #a5b0f0;

  /* Ink */
  --ink-1: #232936;
  --ink-2: #46516b;
  --ink-3: #566179;
  --ink-4: #667089;
  --ink-5: #8b96ad;
  --ink-6: #aab3c5;

  /* Surfaces */
  --surface-page: #eef1f6;
  --surface-panel: #ffffff;
  --surface-header: #f7f9fc;
  --surface-zebra: #f8fafc;
  --surface-group: #f9fafd;
  --surface-input: #fafbfd;
  --surface-hover: #f4f5fa;

  /* Borders */
  --border-strong: #e2e7f0;
  --border-soft: #e9edf4;
  --border-row: #f0f3f8;
  --border-condition: #ebebef;
  --border-dashed: #c8d0e0;

  /* Amber — degraded state */
  --amber-text: #b45309;
  --amber-text-deep: #7c5410;
  --amber-mark: #d97706;
  --amber-bg: #fdf8ee;
  --amber-bg-strip: #fdf6ea;
  --amber-bg-tag: #f5e6c8;
  --amber-border: #ecd9b8;
  --amber-border-strip: #f0dfc0;
  --amber-border-deep: #e2cf9f;

  /* Semantic */
  --crm-bg: #e7f4ec;
  --crm-text: #1d7a45;
  --error-bg: #fbf1f1;
  --error-text: #b91c1c;
  --error-border: #e8c7c7;

  /* Dark */
  --dark-bg: #232936;
  --dark-border: #414d66;
  --dark-hover: #2e374a;

  /* Type */
  --font-ui: 'Instrument Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  /* Radii */
  --radius-control: 6px;
  --radius-control-lg: 8px;
  --radius-surface: 10px;
  --radius-surface-lg: 14px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(28, 35, 54, 0.05);
  --shadow-menu: 0 8px 28px rgba(35, 41, 54, 0.12);
  --shadow-bulk: 0 10px 30px rgba(35, 41, 54, 0.3);
}
```

- [ ] **Step 7: Write global styles**

Create `src/styles/global.css`:

```css
@import './tokens.css';

html, body, #root { height: 100%; }
html, body { margin: 0; padding: 0; background: var(--surface-page); }
body { min-height: 100dvh; }
* { box-sizing: border-box; }

body {
  font-family: var(--font-ui);
  color: var(--ink-1);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); }
a:hover { color: var(--accent-hover); }
input, select, button { font-family: inherit; }

input:focus, select:focus { outline: 2px solid var(--accent-border); outline-offset: -1px; }
:focus-visible { outline: 2px solid var(--accent-border); outline-offset: 1px; }

@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

::-webkit-scrollbar { height: 10px; width: 10px; }
::-webkit-scrollbar-thumb { background: #ccd4e2; border-radius: 5px; border: 2px solid #fff; }
::-webkit-scrollbar-corner { background: #fff; }
```

- [ ] **Step 8: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fieldset — a filter &amp; table edge-case study</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Reduce `src/main.tsx` and `src/App.tsx` to a placeholder**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

`src/App.tsx`:

```tsx
export function App() {
  return <div>Fieldset</div>
}
```

- [ ] **Step 10: Verify the toolchain**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all three succeed.

- [ ] **Step 11: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 12: Write `README.md`**

Cover: what Fieldset is, the three edge cases it demonstrates, `npm install` / `npm run dev`,
the `npm run` script table, a pointer to the spec and to `design_handoff_fieldset/` as the
visual source of truth, and a note that the app is embeddable in an iframe.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS with tokens, tooling and CI"
```

---

### Task 2: Domain types, field catalogue, formatting, data generator

**Files:**
- Create: `src/domain/types.ts`, `src/domain/fields.ts`, `src/domain/format.ts`, `src/domain/generateCompanies.ts`
- Test: `src/domain/generateCompanies.test.ts`, `src/domain/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Company`, `Field`, `FieldType`, `OpId`, `Cond`, `Group`, `TreeNode`, `SortSpec`,
  `Density`, `Phase`, `SavedView`, `ColumnDef`; `FIELDS`, `OPS`, `COLS`, `getField(key)`,
  `defaultOp(type)`; `formatNumber(n)`, `formatDate(ts)`;
  `generateCompanies(n, opts?) => Company[]`, `mulberry32(seed) => () => number`.

- [ ] **Step 1: Write the types**

Create `src/domain/types.ts`:

```ts
export type FieldType = 'text' | 'number' | 'enum' | 'date' | 'boolean'

export type OpId =
  | 'contains' | 'is' | 'is_not' | 'starts' | 'empty'
  | 'gt' | 'lt' | 'eq' | 'between'
  | 'any_of' | 'not_any_of'
  | 'last30' | 'last90' | 'before' | 'after'
  | 'true' | 'false'

export interface Field {
  key: string
  label: string
  type: FieldType
  options?: string[]
}

export interface Company {
  id: number
  name: string
  industry: string
  stage: string
  headcount: number
  revenue: number
  country: string
  founded: number
  lastActivity: number
  owner: string
  inCRM: boolean
}

export type CompanyKey = keyof Company

export interface Cond {
  kind: 'cond'
  id: string
  field: string
  op: OpId
  value: string | string[]
  value2: string
}

export interface Group {
  kind: 'group'
  id: string
  op: 'AND' | 'OR'
  children: TreeNode[]
}

export type TreeNode = Cond | Group

export interface SortSpec {
  key: CompanyKey
  dir: 'asc' | 'desc'
}

export interface SavedView {
  id: string
  name: string
  tree: Group
  warn?: boolean
}

export interface ColumnDef {
  key: CompanyKey
  label: string
  w: number
  mono?: boolean
  right?: boolean
  badge?: boolean
}

export type Density = 'Compact' | 'Comfortable' | 'Spacious'
export type Phase = 'loading' | 'ready' | 'error'

export const ROW_HEIGHT: Record<Density, number> = {
  Compact: 32,
  Comfortable: 40,
  Spacious: 50,
}
```

- [ ] **Step 2: Write the field catalogue**

Create `src/domain/fields.ts`. The `FIELDS`, `OPS` and `COLS` data is transcribed from
`design_handoff_fieldset/Fieldset.dc.html:348-376` — labels, option lists, operator order and
column widths must match exactly:

```ts
import type { ColumnDef, Field, FieldType, OpId } from './types'

export const FIELDS: Field[] = [
  { key: 'name', label: 'Company name', type: 'text' },
  { key: 'industry', label: 'Industry', type: 'enum',
    options: ['SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Cybersecurity', 'EdTech', 'Logistics', 'AI/ML'] },
  { key: 'stage', label: 'Stage', type: 'enum',
    options: ['Seed', 'Series A', 'Series B', 'Series C', 'Public'] },
  { key: 'headcount', label: 'Headcount', type: 'number' },
  { key: 'revenue', label: 'Revenue ($M)', type: 'number' },
  { key: 'country', label: 'Country', type: 'enum',
    options: ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'India', 'Brazil'] },
  { key: 'founded', label: 'Founded', type: 'date' },
  { key: 'lastActivity', label: 'Last activity', type: 'date' },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'inCRM', label: 'In CRM', type: 'boolean' },
]

export const OPS: Record<FieldType, Array<[OpId, string]>> = {
  text: [['contains', 'contains'], ['is', 'is'], ['is_not', 'is not'], ['starts', 'starts with'], ['empty', 'is empty']],
  number: [['gt', 'more than'], ['lt', 'less than'], ['eq', 'equals'], ['between', 'between']],
  enum: [['is', 'is'], ['is_not', 'is not'], ['any_of', 'is any of'], ['not_any_of', 'is not any of']],
  date: [['last30', 'in last 30 days'], ['last90', 'in last 90 days'], ['before', 'before'], ['after', 'after'], ['between', 'between']],
  boolean: [['true', 'is true'], ['false', 'is false']],
}

export const COLS: ColumnDef[] = [
  { key: 'industry', label: 'Industry', w: 130 },
  { key: 'stage', label: 'Stage', w: 110 },
  { key: 'headcount', label: 'Headcount', w: 110, mono: true, right: true },
  { key: 'revenue', label: 'Revenue', w: 110, mono: true, right: true },
  { key: 'country', label: 'Country', w: 140 },
  { key: 'founded', label: 'Founded', w: 110, mono: true },
  { key: 'lastActivity', label: 'Last activity', w: 130, mono: true },
  { key: 'owner', label: 'Owner', w: 150 },
  { key: 'inCRM', label: 'CRM', w: 90, badge: true },
]

export const NAME_COL_DEFAULT_WIDTH = 220

export function getField(key: string): Field | undefined {
  return FIELDS.find((f) => f.key === key)
}

export function defaultOp(type: FieldType): OpId {
  return OPS[type][0][0]
}

export function getColumn(key: string): ColumnDef | undefined {
  return COLS.find((c) => c.key === key)
}
```

- [ ] **Step 3: Write the failing formatting test**

Create `src/domain/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber } from './format'

describe('formatNumber', () => {
  it('groups thousands with commas', () => {
    expect(formatNumber(5000)).toBe('5,000')
    expect(formatNumber(50000)).toBe('50,000')
    expect(formatNumber(7)).toBe('7')
  })
})

describe('formatDate', () => {
  it('renders an ISO calendar date in UTC', () => {
    expect(formatDate(Date.UTC(2021, 4, 9))).toBe('2021-05-09')
  })
})
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npx vitest run src/domain/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 5: Implement formatting**

Create `src/domain/format.ts`:

```ts
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}
```

- [ ] **Step 6: Run it to confirm it passes**

Run: `npx vitest run src/domain/format.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing generator test**

Create `src/domain/generateCompanies.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateCompanies } from './generateCompanies'
import { FIELDS } from './fields'

const NOW = Date.UTC(2026, 0, 1)
const gen = (n: number) => generateCompanies(n, { now: NOW })

describe('generateCompanies', () => {
  it('is deterministic for a fixed seed', () => {
    expect(gen(50)).toEqual(gen(50))
  })

  it('produces a prefix-stable sequence regardless of length', () => {
    expect(gen(200).slice(0, 50)).toEqual(gen(50))
  })

  it('assigns sequential ids from zero', () => {
    const rows = gen(10)
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('draws enum values only from the declared options', () => {
    const industries = new Set(FIELDS[1].options)
    const stages = new Set(FIELDS[2].options)
    const countries = new Set(FIELDS[5].options)
    for (const r of gen(500)) {
      expect(industries.has(r.industry)).toBe(true)
      expect(stages.has(r.stage)).toBe(true)
      expect(countries.has(r.country)).toBe(true)
    }
  })

  it('keeps numeric and temporal values within their documented bounds', () => {
    const day = 864e5
    for (const r of gen(500)) {
      expect(r.headcount).toBeGreaterThanOrEqual(2)
      expect(r.revenue).toBeGreaterThan(0)
      expect(new Date(r.founded).getUTCFullYear()).toBeGreaterThanOrEqual(1995)
      expect(new Date(r.founded).getUTCFullYear()).toBeLessThanOrEqual(2025)
      expect(r.lastActivity).toBeLessThanOrEqual(NOW)
      expect(r.lastActivity).toBeGreaterThan(NOW - 241 * day)
    }
  })

  it('names every company with two words', () => {
    for (const r of gen(100)) expect(r.name.split(' ')).toHaveLength(2)
  })

  it('marks roughly 42 percent of companies as in CRM', () => {
    const rows = gen(5000)
    const share = rows.filter((r) => r.inCRM).length / rows.length
    expect(share).toBeGreaterThan(0.39)
    expect(share).toBeLessThan(0.45)
  })
})
```

- [ ] **Step 8: Run it to confirm it fails**

Run: `npx vitest run src/domain/generateCompanies.test.ts`
Expected: FAIL — cannot resolve `./generateCompanies`.

- [ ] **Step 9: Implement the generator**

Create `src/domain/generateCompanies.ts`. The word lists, owner list and distribution
arithmetic are transcribed from `design_handoff_fieldset/Fieldset.dc.html:418-443`. The one
deliberate change from the prototype: `now` is a parameter rather than a `Date.now()` call, so
`lastActivity` is deterministic and testable.

```ts
import { FIELDS } from './fields'
import type { Company } from './types'

export function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PREFIXES = ['Arden','Basalt','Cinder','Dovetail','Ember','Fable','Gable','Halcyon','Ionic','Juniper','Kestrel','Lumen','Meridian','Nimbus','Onyx','Pillar','Quarry','Rivet','Sable','Tandem','Umber','Vantage','Willow','Zenith','Cobalt','Drift','Ferrous','Grove','Harbor','Ledger','Marrow','North','Opal','Prism','Relay','Signal','Tessera','Vector','Atlas','Beacon']

const SUFFIXES = ['Labs','Systems','HQ','AI','Cloud','Works','Data','Stack','Base','Flow','Metrics','Grid','Ops','Loop','Forge','Path','Scale','Pulse','Link','Core']

const OWNERS = ['Ana Ferreira','Ben Okafor','Chloe Martin','Dev Patel','Elif Aydin','Franz Weber','Grace Liu','Hugo Silva','Iris Kowalski','Jonas Berg','Keiko Tanaka','Liam Byrne']

const DAY = 864e5

export interface GenerateOptions {
  seed?: number
  now?: number
}

export function generateCompanies(n: number, opts: GenerateOptions = {}): Company[] {
  const { seed = 42, now = Date.now() } = opts
  const rand = mulberry32(seed)
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]

  const industries = FIELDS[1].options!
  const stages = FIELDS[2].options!
  const countries = FIELDS[5].options!

  const out: Company[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      id: i,
      name: `${pick(PREFIXES)} ${pick(SUFFIXES)}`,
      industry: pick(industries),
      stage: pick(stages),
      headcount: Math.floor(Math.exp(rand() * 9.2)) + 2,
      revenue: +(Math.exp(rand() * 6.2) / 10).toFixed(1),
      country: pick(countries),
      founded: Date.UTC(1995 + Math.floor(rand() * 30), Math.floor(rand() * 12), 1 + Math.floor(rand() * 28)),
      lastActivity: now - Math.floor(rand() * 240) * DAY,
      owner: pick(OWNERS),
      inCRM: rand() < 0.42,
    })
  }
  return out
}
```

- [ ] **Step 10: Run the suite**

Run: `npm run test`
Expected: PASS, all tests green.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(domain): add types, field catalogue, formatting and seeded generator"
```

---

### Task 3: Filter engine

This task implements the three semantics the whole project exists to demonstrate. The tests are
the specification; write them first and do not soften them.

**Files:**
- Create: `src/domain/filter.ts`
- Test: `src/domain/filter.test.ts`

**Interfaces:**
- Consumes: `Company`, `Cond`, `Group`, `OpId` from `./types`; `getField` from `./fields`.
- Produces:
  - `evalCond(cond: Cond, row: Company, now: number): boolean | null`
  - `evalGroup(group: Group, row: Company, now: number): boolean`
  - `filterRows(rows: Company[], tree: Group, now: number): Company[]`
  - `countIgnoredConditions(tree: Group): number`
  - `conditionHits(rows: Company[], cond: Cond, now: number): number`

- [ ] **Step 1: Write the failing test**

Create `src/domain/filter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { conditionHits, countIgnoredConditions, evalCond, evalGroup, filterRows } from './filter'
import type { Company, Cond, Group, OpId } from './types'

const NOW = Date.UTC(2026, 0, 1)
const DAY = 864e5

const row = (over: Partial<Company> = {}): Company => ({
  id: 1,
  name: 'Vantage Labs',
  industry: 'SaaS',
  stage: 'Series B',
  headcount: 300,
  revenue: 12.5,
  country: 'Germany',
  founded: Date.UTC(2014, 2, 3),
  lastActivity: NOW - 10 * DAY,
  owner: 'Grace Liu',
  inCRM: false,
  ...over,
})

const cond = (field: string, op: OpId, value: string | string[] = '', value2 = ''): Cond => ({
  kind: 'cond', id: `c_${field}_${op}`, field, op, value, value2,
})

const group = (op: 'AND' | 'OR', children: Group['children']): Group => ({
  kind: 'group', id: 'g', op, children,
})

describe('evalCond — deleted field semantics', () => {
  it('returns null for an unknown field rather than false', () => {
    expect(evalCond(cond('region_emea', 'is', 'EMEA'), row(), NOW)).toBeNull()
  })
})

describe('evalCond — empty value matches everything', () => {
  it('matches when a text value is blank', () => {
    expect(evalCond(cond('name', 'contains', ''), row(), NOW)).toBe(true)
  })

  it('matches when a number value is blank', () => {
    expect(evalCond(cond('headcount', 'gt', ''), row(), NOW)).toBe(true)
  })

  it('matches when an any_of selection is empty', () => {
    expect(evalCond(cond('industry', 'any_of', []), row(), NOW)).toBe(true)
  })

  it('matches when a between range is missing its second bound', () => {
    expect(evalCond(cond('headcount', 'between', '100'), row(), NOW)).toBe(true)
  })
})

describe('evalCond — text operators', () => {
  it('matches contains case-insensitively', () => {
    expect(evalCond(cond('name', 'contains', 'VANTAGE'), row(), NOW)).toBe(true)
    expect(evalCond(cond('name', 'contains', 'nimbus'), row(), NOW)).toBe(false)
  })

  it('matches is, is not and starts with', () => {
    expect(evalCond(cond('name', 'is', 'vantage labs'), row(), NOW)).toBe(true)
    expect(evalCond(cond('name', 'is_not', 'vantage labs'), row(), NOW)).toBe(false)
    expect(evalCond(cond('name', 'starts', 'Van'), row(), NOW)).toBe(true)
  })

  it('treats is empty as a test of the field, not of the query', () => {
    expect(evalCond(cond('owner', 'empty'), row({ owner: '' }), NOW)).toBe(true)
    expect(evalCond(cond('owner', 'empty'), row(), NOW)).toBe(false)
  })
})

describe('evalCond — number operators', () => {
  it('compares with more than, less than and equals', () => {
    expect(evalCond(cond('headcount', 'gt', '200'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'lt', '200'), row(), NOW)).toBe(false)
    expect(evalCond(cond('headcount', 'eq', '300'), row(), NOW)).toBe(true)
  })

  it('treats between as inclusive and order-independent', () => {
    expect(evalCond(cond('headcount', 'between', '400', '200'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'between', '300', '300'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'between', '10', '20'), row(), NOW)).toBe(false)
  })
})

describe('evalCond — enum operators', () => {
  it('matches is and is not', () => {
    expect(evalCond(cond('industry', 'is', 'SaaS'), row(), NOW)).toBe(true)
    expect(evalCond(cond('industry', 'is_not', 'SaaS'), row(), NOW)).toBe(false)
  })

  it('matches any_of and not_any_of against a selection', () => {
    expect(evalCond(cond('industry', 'any_of', ['Fintech', 'SaaS']), row(), NOW)).toBe(true)
    expect(evalCond(cond('industry', 'any_of', ['Fintech']), row(), NOW)).toBe(false)
    expect(evalCond(cond('industry', 'not_any_of', ['Fintech']), row(), NOW)).toBe(true)
  })
})

describe('evalCond — date operators', () => {
  it('matches relative windows against the injected now', () => {
    expect(evalCond(cond('lastActivity', 'last30'), row(), NOW)).toBe(true)
    expect(evalCond(cond('lastActivity', 'last30'), row({ lastActivity: NOW - 60 * DAY }), NOW)).toBe(false)
    expect(evalCond(cond('lastActivity', 'last90'), row({ lastActivity: NOW - 60 * DAY }), NOW)).toBe(true)
  })

  it('matches before, after and between', () => {
    expect(evalCond(cond('founded', 'before', '2020-01-01'), row(), NOW)).toBe(true)
    expect(evalCond(cond('founded', 'after', '2020-01-01'), row(), NOW)).toBe(false)
    expect(evalCond(cond('founded', 'between', '2010-01-01', '2016-01-01'), row(), NOW)).toBe(true)
  })
})

describe('evalCond — boolean operators', () => {
  it('matches is true and is false', () => {
    expect(evalCond(cond('inCRM', 'true'), row({ inCRM: true }), NOW)).toBe(true)
    expect(evalCond(cond('inCRM', 'false'), row({ inCRM: false }), NOW)).toBe(true)
    expect(evalCond(cond('inCRM', 'true'), row({ inCRM: false }), NOW)).toBe(false)
  })
})

describe('evalGroup', () => {
  it('matches everything when the group is empty', () => {
    expect(evalGroup(group('AND', []), row(), NOW)).toBe(true)
  })

  it('excludes null results rather than treating them as false', () => {
    const g = group('AND', [cond('region_emea', 'is', 'EMEA'), cond('industry', 'is', 'SaaS')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('matches everything when every child is ignored', () => {
    const g = group('AND', [cond('region_emea', 'is', 'EMEA')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('requires every live child under AND', () => {
    const g = group('AND', [cond('industry', 'is', 'SaaS'), cond('country', 'is', 'France')])
    expect(evalGroup(g, row(), NOW)).toBe(false)
  })

  it('requires one live child under OR', () => {
    const g = group('OR', [cond('industry', 'is', 'Fintech'), cond('country', 'is', 'Germany')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('evaluates nested groups', () => {
    const g = group('AND', [
      cond('industry', 'is', 'SaaS'),
      group('OR', [cond('headcount', 'gt', '200'), cond('revenue', 'gt', '5')]),
    ])
    expect(evalGroup(g, row(), NOW)).toBe(true)
    expect(evalGroup(g, row({ headcount: 5, revenue: 1 }), NOW)).toBe(false)
  })
})

describe('filterRows', () => {
  it('returns only matching rows', () => {
    const rows = [row({ id: 1 }), row({ id: 2, industry: 'Fintech' })]
    const g = group('AND', [cond('industry', 'is', 'SaaS')])
    expect(filterRows(rows, g, NOW).map((r) => r.id)).toEqual([1])
  })
})

describe('countIgnoredConditions', () => {
  it('counts unknown-field conditions at every depth', () => {
    const g = group('AND', [
      cond('region_emea', 'is', 'EMEA'),
      group('OR', [cond('legacy_tier', 'is', 'A'), cond('industry', 'is', 'SaaS')]),
    ])
    expect(countIgnoredConditions(g)).toBe(2)
  })

  it('counts nothing when every field is live', () => {
    expect(countIgnoredConditions(group('AND', [cond('industry', 'is', 'SaaS')]))).toBe(0)
  })
})

describe('conditionHits', () => {
  it('counts rows matching a single condition across the whole dataset', () => {
    const rows = [row({ id: 1 }), row({ id: 2, industry: 'Fintech' }), row({ id: 3 })]
    expect(conditionHits(rows, cond('industry', 'is', 'SaaS'), NOW)).toBe(2)
  })

  it('counts nothing for a deleted field', () => {
    expect(conditionHits([row()], cond('region_emea', 'is', 'EMEA'), NOW)).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/domain/filter.test.ts`
Expected: FAIL — cannot resolve `./filter`.

- [ ] **Step 3: Implement the filter engine**

Create `src/domain/filter.ts`:

```ts
import { getField } from './fields'
import type { Company, Cond, Group, TreeNode } from './types'

const DAY = 864e5

export function evalCond(cond: Cond, row: Company, now: number): boolean | null {
  const field = getField(cond.field)
  if (!field) return null

  const raw = row[cond.field as keyof Company]
  const query = Array.isArray(cond.value) ? '' : (cond.value ?? '') + ''

  switch (field.type) {
    case 'text': {
      const text = String(raw).toLowerCase()
      const q = query.toLowerCase()
      if (cond.op === 'empty') return !text
      if (!q) return true
      if (cond.op === 'contains') return text.includes(q)
      if (cond.op === 'is') return text === q
      if (cond.op === 'is_not') return text !== q
      if (cond.op === 'starts') return text.startsWith(q)
      return true
    }
    case 'number': {
      if (query === '') return true
      const value = raw as number
      const a = parseFloat(query)
      const b = parseFloat(cond.value2)
      if (Number.isNaN(a)) return true
      if (cond.op === 'gt') return value > a
      if (cond.op === 'lt') return value < a
      if (cond.op === 'eq') return value === a
      if (cond.op === 'between') {
        if (Number.isNaN(b)) return true
        return value >= Math.min(a, b) && value <= Math.max(a, b)
      }
      return true
    }
    case 'enum': {
      if (cond.op === 'any_of' || cond.op === 'not_any_of') {
        const selected = Array.isArray(cond.value) ? cond.value : []
        if (!selected.length) return true
        return cond.op === 'any_of'
          ? selected.includes(raw as string)
          : !selected.includes(raw as string)
      }
      if (!query) return true
      return cond.op === 'is_not' ? raw !== query : raw === query
    }
    case 'date': {
      const value = raw as number
      if (cond.op === 'last30') return value >= now - 30 * DAY
      if (cond.op === 'last90') return value >= now - 90 * DAY
      const a = Date.parse(query)
      const b = Date.parse(cond.value2)
      if (Number.isNaN(a)) return true
      if (cond.op === 'before') return value < a
      if (cond.op === 'after') return value > a
      if (cond.op === 'between') {
        if (Number.isNaN(b)) return true
        return value >= Math.min(a, b) && value <= Math.max(a, b)
      }
      return true
    }
    case 'boolean':
      return cond.op === 'false' ? !raw : !!raw
  }
}

export function evalGroup(group: Group, row: Company, now: number): boolean {
  const results: boolean[] = []
  for (const child of group.children) {
    const result = child.kind === 'group' ? evalGroup(child, row, now) : evalCond(child, row, now)
    if (result !== null) results.push(result)
  }
  if (!results.length) return true
  return group.op === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

export function filterRows(rows: Company[], tree: Group, now: number): Company[] {
  return rows.filter((row) => evalGroup(tree, row, now))
}

export function countIgnoredConditions(tree: Group): number {
  let count = 0
  const visit = (node: TreeNode) => {
    if (node.kind === 'group') node.children.forEach(visit)
    else if (!getField(node.field)) count++
  }
  tree.children.forEach(visit)
  return count
}

export function conditionHits(rows: Company[], cond: Cond, now: number): number {
  let hits = 0
  for (const row of rows) if (evalCond(cond, row, now) === true) hits++
  return hits
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/domain/filter.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): add filter engine with null semantics for deleted fields"
```

---

### Task 4: Tree mutation, sorting, virtual window

**Files:**
- Create: `src/domain/tree.ts`, `src/domain/sort.ts`, `src/domain/virtual.ts`
- Test: `src/domain/tree.test.ts`, `src/domain/sort.test.ts`, `src/domain/virtual.test.ts`

**Interfaces:**
- Consumes: `Cond`, `Group`, `TreeNode`, `SortSpec`, `Company`, `SavedView` from `./types`;
  `defaultOp`, `getField` from `./fields`.
- Produces:
  - `makeId(): string`, `newCondition(): Cond`, `newGroup(): Group`, `emptyTree(): Group`
  - `cloneTree(tree: Group): Group`, `findParent(tree, id) => { parent: Group; index: number } | null`
  - `updateTree(tree, mutate: (draft: Group) => void): Group`
  - `patchCondition(tree, id, patch: Partial<Cond>): Group`, `removeNode(tree, id): Group`
  - `addCondition(tree, parentId): Group`, `addGroup(tree): Group`, `toggleNodeOp(tree, id): Group`
  - `seedViews(): SavedView[]`
  - `buildComparator(sorts): (a: Company, b: Company) => number`, `sortRows(rows, sorts): Company[]`,
    `toggleSort(sorts, key, append): SortSpec[]`
  - `computeWindow(opts): { start; end; topPad; botPad }`

- [ ] **Step 1: Write the failing tree test**

Create `src/domain/tree.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  addCondition, addGroup, cloneTree, emptyTree, findParent, makeId,
  newCondition, newGroup, patchCondition, removeNode, seedViews, toggleNodeOp,
} from './tree'
import type { Cond, Group } from './types'

const cond = (id: string, field = 'industry'): Cond => ({
  kind: 'cond', id, field, op: 'is', value: 'SaaS', value2: '',
})

const tree = (): Group => ({
  kind: 'group', id: 'root', op: 'AND',
  children: [
    cond('c1'),
    { kind: 'group', id: 'g1', op: 'OR', children: [cond('c2'), cond('c3')] },
  ],
})

describe('makeId', () => {
  it('never repeats', () => {
    const ids = new Set(Array.from({ length: 500 }, () => makeId()))
    expect(ids.size).toBe(500)
  })
})

describe('cloneTree', () => {
  it('produces a deep copy that does not share nested references', () => {
    const original = tree()
    const copy = cloneTree(original)
    expect(copy).toEqual(original)
    const nested = copy.children[1] as Group
    nested.children.pop()
    expect((original.children[1] as Group).children).toHaveLength(2)
  })
})

describe('findParent', () => {
  it('finds a top-level node', () => {
    expect(findParent(tree(), 'c1')?.index).toBe(0)
  })

  it('finds a nested node and reports its containing group', () => {
    const found = findParent(tree(), 'c3')
    expect(found?.parent.id).toBe('g1')
    expect(found?.index).toBe(1)
  })

  it('returns null for an unknown id', () => {
    expect(findParent(tree(), 'nope')).toBeNull()
  })
})

describe('patchCondition', () => {
  it('applies the patch without mutating the source tree', () => {
    const original = tree()
    const next = patchCondition(original, 'c1', { value: 'Fintech' })
    expect((next.children[0] as Cond).value).toBe('Fintech')
    expect((original.children[0] as Cond).value).toBe('SaaS')
  })

  it('patches a nested condition', () => {
    const next = patchCondition(tree(), 'c3', { op: 'is_not' })
    const nested = next.children[1] as Group
    expect((nested.children[1] as Cond).op).toBe('is_not')
  })

  it('returns an equal tree when the id is unknown', () => {
    expect(patchCondition(tree(), 'nope', { value: 'x' })).toEqual(tree())
  })
})

describe('removeNode', () => {
  it('removes a top-level node', () => {
    expect(removeNode(tree(), 'c1').children).toHaveLength(1)
  })

  it('removes a nested node', () => {
    const nested = removeNode(tree(), 'c2').children[1] as Group
    expect(nested.children.map((c) => c.id)).toEqual(['c3'])
  })

  it('removes an entire group', () => {
    expect(removeNode(tree(), 'g1').children.map((c) => c.id)).toEqual(['c1'])
  })
})

describe('addCondition', () => {
  it('appends to the root when given the root id', () => {
    const next = addCondition(tree(), 'root')
    expect(next.children).toHaveLength(3)
    expect(next.children[2].kind).toBe('cond')
  })

  it('appends into a nested group', () => {
    const nested = addCondition(tree(), 'g1').children[1] as Group
    expect(nested.children).toHaveLength(3)
  })
})

describe('addGroup', () => {
  it('appends an OR group seeded with one condition', () => {
    const next = addGroup(tree())
    const added = next.children[2] as Group
    expect(added.kind).toBe('group')
    expect(added.op).toBe('OR')
    expect(added.children).toHaveLength(1)
  })
})

describe('toggleNodeOp', () => {
  it('flips the root operator', () => {
    expect(toggleNodeOp(tree(), 'root').op).toBe('OR')
  })

  it('flips a nested group operator', () => {
    expect((toggleNodeOp(tree(), 'g1').children[1] as Group).op).toBe('AND')
  })
})

describe('newCondition and newGroup', () => {
  it('seeds a condition on industry is SaaS', () => {
    const c = newCondition()
    expect(c).toMatchObject({ kind: 'cond', field: 'industry', op: 'is', value: 'SaaS' })
  })

  it('seeds a group as OR containing one condition', () => {
    expect(newGroup()).toMatchObject({ kind: 'group', op: 'OR' })
    expect(newGroup().children).toHaveLength(1)
  })
})

describe('emptyTree', () => {
  it('is an AND group with no children', () => {
    expect(emptyTree()).toMatchObject({ kind: 'group', op: 'AND', children: [] })
  })
})

describe('seedViews', () => {
  it('provides the four seeded views in order', () => {
    expect(seedViews().map((v) => v.name)).toEqual([
      'All companies',
      'ICP · Mid-market SaaS',
      'Not in CRM, active',
      'EMEA legacy',
    ])
  })

  it('flags EMEA legacy as referencing a deleted field', () => {
    const legacy = seedViews().find((v) => v.name === 'EMEA legacy')!
    expect(legacy.warn).toBe(true)
    expect(JSON.stringify(legacy.tree)).toContain('region_emea')
  })

  it('gives every view a distinct tree instance', () => {
    const views = seedViews()
    views[1].tree.children.pop()
    expect(seedViews()[1].tree.children).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/domain/tree.test.ts`
Expected: FAIL — cannot resolve `./tree`.

- [ ] **Step 3: Implement tree operations**

Create `src/domain/tree.ts`:

```ts
import type { Cond, Group, SavedView, TreeNode } from './types'

let counter = 0

export function makeId(): string {
  counter += 1
  return `n${counter}_${Math.random().toString(36).slice(2, 7)}`
}

export function newCondition(): Cond {
  return { kind: 'cond', id: makeId(), field: 'industry', op: 'is', value: 'SaaS', value2: '' }
}

export function newGroup(): Group {
  return { kind: 'group', id: makeId(), op: 'OR', children: [newCondition()] }
}

export function emptyTree(): Group {
  return { kind: 'group', id: 'root', op: 'AND', children: [] }
}

export function cloneTree(tree: Group): Group {
  return structuredClone(tree)
}

export function findParent(
  tree: Group,
  id: string
): { parent: Group; index: number } | null {
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i]
    if (child.id === id) return { parent: tree, index: i }
    if (child.kind === 'group') {
      const found = findParent(child, id)
      if (found) return found
    }
  }
  return null
}

export function updateTree(tree: Group, mutate: (draft: Group) => void): Group {
  const draft = cloneTree(tree)
  mutate(draft)
  return draft
}

function findGroup(tree: Group, id: string): Group | null {
  if (tree.id === id) return tree
  for (const child of tree.children) {
    if (child.kind === 'group') {
      const found = findGroup(child, id)
      if (found) return found
    }
  }
  return null
}

export function patchCondition(tree: Group, id: string, patch: Partial<Cond>): Group {
  return updateTree(tree, (draft) => {
    const found = findParent(draft, id)
    if (!found) return
    const node = found.parent.children[found.index]
    if (node.kind === 'cond') Object.assign(node, patch)
  })
}

export function removeNode(tree: Group, id: string): Group {
  return updateTree(tree, (draft) => {
    const found = findParent(draft, id)
    if (found) found.parent.children.splice(found.index, 1)
  })
}

export function addCondition(tree: Group, parentId: string): Group {
  return updateTree(tree, (draft) => {
    const target = findGroup(draft, parentId)
    if (target) target.children.push(newCondition())
  })
}

export function addGroup(tree: Group): Group {
  return updateTree(tree, (draft) => {
    draft.children.push(newGroup())
  })
}

export function toggleNodeOp(tree: Group, id: string): Group {
  return updateTree(tree, (draft) => {
    const target = findGroup(draft, id)
    if (target) target.op = target.op === 'AND' ? 'OR' : 'AND'
  })
}

export function walkTree(tree: Group, fn: (node: TreeNode, parent: Group) => void): void {
  for (const child of tree.children) {
    fn(child, tree)
    if (child.kind === 'group') walkTree(child, fn)
  }
}

function cond(field: string, op: Cond['op'], value: string | string[] = '', value2 = ''): Cond {
  return { kind: 'cond', id: makeId(), field, op, value, value2 }
}

export function icpTree(): Group {
  return {
    kind: 'group', id: 'root', op: 'AND',
    children: [
      cond('industry', 'is', 'SaaS'),
      { kind: 'group', id: makeId(), op: 'OR', children: [cond('headcount', 'gt', '200'), cond('revenue', 'gt', '5')] },
      cond('inCRM', 'false'),
    ],
  }
}

export function seedViews(): SavedView[] {
  return [
    { id: 'v_all', name: 'All companies', tree: emptyTree() },
    { id: 'v_icp', name: 'ICP · Mid-market SaaS', tree: icpTree() },
    {
      id: 'v_ncrm', name: 'Not in CRM, active',
      tree: { kind: 'group', id: 'root', op: 'AND', children: [cond('inCRM', 'false'), cond('lastActivity', 'last90')] },
    },
    {
      id: 'v_legacy', name: 'EMEA legacy', warn: true,
      tree: { kind: 'group', id: 'root', op: 'AND', children: [cond('region_emea', 'is', 'EMEA'), cond('revenue', 'gt', '1')] },
    },
  ]
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/domain/tree.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing sort test**

Create `src/domain/sort.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sortRows, toggleSort } from './sort'
import type { Company, SortSpec } from './types'

const co = (id: number, over: Partial<Company> = {}): Company => ({
  id, name: 'Atlas Core', industry: 'SaaS', stage: 'Seed', headcount: 10, revenue: 1,
  country: 'Canada', founded: 0, lastActivity: 0, owner: 'Dev Patel', inCRM: false, ...over,
})

describe('sortRows', () => {
  it('returns a new array and leaves the input order untouched', () => {
    const rows = [co(1, { revenue: 5 }), co(2, { revenue: 9 })]
    const sorted = sortRows(rows, [{ key: 'revenue', dir: 'desc' }])
    expect(sorted.map((r) => r.id)).toEqual([2, 1])
    expect(rows.map((r) => r.id)).toEqual([1, 2])
  })

  it('preserves input order when there are no sorts', () => {
    const rows = [co(2), co(1)]
    expect(sortRows(rows, []).map((r) => r.id)).toEqual([2, 1])
  })

  it('sorts strings with locale comparison', () => {
    const rows = [co(1, { name: 'Zenith Ops' }), co(2, { name: 'Arden Labs' })]
    expect(sortRows(rows, [{ key: 'name', dir: 'asc' }]).map((r) => r.id)).toEqual([2, 1])
  })

  it('applies later sorts only to break ties in earlier ones', () => {
    const rows = [
      co(1, { industry: 'SaaS', revenue: 2 }),
      co(2, { industry: 'Fintech', revenue: 9 }),
      co(3, { industry: 'SaaS', revenue: 8 }),
    ]
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'desc' }]
    expect(sortRows(rows, sorts).map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('breaks remaining ties by id', () => {
    const rows = [co(3, { revenue: 1 }), co(1, { revenue: 1 }), co(2, { revenue: 1 })]
    expect(sortRows(rows, [{ key: 'revenue', dir: 'asc' }]).map((r) => r.id)).toEqual([1, 2, 3])
  })
})

describe('toggleSort — plain click', () => {
  it('sorts a new column ascending', () => {
    expect(toggleSort([], 'revenue', false)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('cycles ascending to descending', () => {
    expect(toggleSort([{ key: 'revenue', dir: 'asc' }], 'revenue', false))
      .toEqual([{ key: 'revenue', dir: 'desc' }])
  })

  it('cycles descending back to no sort', () => {
    expect(toggleSort([{ key: 'revenue', dir: 'desc' }], 'revenue', false)).toEqual([])
  })

  it('collapses an existing multi-sort down to the clicked column', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'desc' }]
    expect(toggleSort(sorts, 'revenue', false)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('replaces a different single sort', () => {
    expect(toggleSort([{ key: 'industry', dir: 'desc' }], 'revenue', false))
      .toEqual([{ key: 'revenue', dir: 'asc' }])
  })
})

describe('toggleSort — shift click', () => {
  it('appends a new column ascending', () => {
    expect(toggleSort([{ key: 'industry', dir: 'asc' }], 'revenue', true))
      .toEqual([{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'asc' }])
  })

  it('cycles an appended column to descending in place', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'asc' }]
    expect(toggleSort(sorts, 'industry', true))
      .toEqual([{ key: 'industry', dir: 'desc' }, { key: 'revenue', dir: 'asc' }])
  })

  it('removes a column on its third shift click', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'desc' }, { key: 'revenue', dir: 'asc' }]
    expect(toggleSort(sorts, 'industry', true)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('does not mutate the input array', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }]
    toggleSort(sorts, 'revenue', true)
    expect(sorts).toHaveLength(1)
  })
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npx vitest run src/domain/sort.test.ts`
Expected: FAIL — cannot resolve `./sort`.

- [ ] **Step 7: Implement sorting**

Create `src/domain/sort.ts`:

```ts
import type { Company, CompanyKey, SortSpec } from './types'

export function buildComparator(sorts: SortSpec[]): (a: Company, b: Company) => number {
  return (a, b) => {
    for (const sort of sorts) {
      const av = a[sort.key]
      const bv = b[sort.key]
      let d: number
      if (typeof av === 'string' && typeof bv === 'string') d = av.localeCompare(bv)
      else d = av === bv ? 0 : av > bv ? 1 : -1
      if (d) return sort.dir === 'desc' ? -d : d
    }
    return a.id - b.id
  }
}

export function sortRows(rows: Company[], sorts: SortSpec[]): Company[] {
  if (!sorts.length) return rows
  return rows.slice().sort(buildComparator(sorts))
}

export function toggleSort(sorts: SortSpec[], key: CompanyKey, append: boolean): SortSpec[] {
  const next = sorts.slice()
  const i = next.findIndex((s) => s.key === key)

  if (append) {
    if (i < 0) next.push({ key, dir: 'asc' })
    else if (next[i].dir === 'asc') next[i] = { key, dir: 'desc' }
    else next.splice(i, 1)
    return next
  }

  if (i < 0 || next.length > 1) return [{ key, dir: 'asc' }]
  if (next[0].dir === 'asc') return [{ key, dir: 'desc' }]
  return []
}
```

- [ ] **Step 8: Run it to confirm it passes**

Run: `npx vitest run src/domain/sort.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing virtual window test**

Create `src/domain/virtual.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeWindow } from './virtual'

const base = { count: 5000, rowHeight: 32, viewportHeight: 640, scrollTop: 0 }

describe('computeWindow', () => {
  it('starts at zero and never goes negative at the top', () => {
    const w = computeWindow(base)
    expect(w.start).toBe(0)
    expect(w.topPad).toBe(0)
  })

  it('overscans five rows above the visible range', () => {
    const w = computeWindow({ ...base, scrollTop: 3200 })
    expect(w.start).toBe(95)
    expect(w.topPad).toBe(95 * 32)
  })

  it('overscans twelve rows below the visible range', () => {
    const w = computeWindow({ ...base, scrollTop: 3200 })
    expect(w.end).toBe(95 + Math.ceil(640 / 32) + 12)
  })

  it('clamps the end to the row count', () => {
    const w = computeWindow({ ...base, count: 10 })
    expect(w.end).toBe(10)
    expect(w.botPad).toBe(0)
  })

  it('pads the remaining rows below the window', () => {
    const w = computeWindow({ ...base, scrollTop: 0 })
    expect(w.botPad).toBe((5000 - w.end) * 32)
  })

  it('handles an empty dataset', () => {
    const w = computeWindow({ ...base, count: 0 })
    expect(w).toEqual({ start: 0, end: 0, topPad: 0, botPad: 0 })
  })

  it('handles a zero-height viewport before measurement', () => {
    const w = computeWindow({ ...base, viewportHeight: 0 })
    expect(w.start).toBe(0)
    expect(w.end).toBe(12)
  })
})
```

- [ ] **Step 10: Run it to confirm it fails**

Run: `npx vitest run src/domain/virtual.test.ts`
Expected: FAIL — cannot resolve `./virtual`.

- [ ] **Step 11: Implement the virtual window**

Create `src/domain/virtual.ts`:

```ts
export interface WindowInput {
  count: number
  rowHeight: number
  viewportHeight: number
  scrollTop: number
  overscanAbove?: number
  overscanBelow?: number
}

export interface WindowRange {
  start: number
  end: number
  topPad: number
  botPad: number
}

export function computeWindow({
  count,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscanAbove = 5,
  overscanBelow = 12,
}: WindowInput): WindowRange {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanAbove)
  const visible = Math.ceil(viewportHeight / rowHeight)
  const end = Math.min(count, start + visible + overscanBelow)
  return {
    start,
    end,
    topPad: start * rowHeight,
    botPad: Math.max(0, (count - end) * rowHeight),
  }
}
```

- [ ] **Step 12: Run the whole suite**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(domain): add tree mutation, multi-sort and virtual window"
```

---

### Task 5: Selection state machine

This is the flagship edge case. Every transition in spec section 7 gets a test.

**Files:**
- Create: `src/domain/selection.ts`
- Test: `src/domain/selection.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SelectionState = { mode: 'ids' | 'all'; ids: ReadonlySet<number>; snapCount: number; anchor: number | null; dismissKey: string | null }`
  - `emptySelection(): SelectionState`, `clearSelection(): SelectionState`
  - `isSelected(sel, id): boolean`, `selectedCount(sel): number`
  - `toggleRow(sel, { id, index, shiftKey, sortedIds }): SelectionState`
  - `toggleWindow(sel, windowIds: number[]): SelectionState`
  - `selectAllMatching(sel, matchingIds: number[]): SelectionState`
  - `canSelectAllMatching(sel, filteredCount): boolean`
  - `needsReconciliation(sel, filteredCount, filterKey): boolean`
  - `stillMatchingCount(sel, filteredIds: number[]): number`
  - `keepAll(sel, filterKey): SelectionState`
  - `trimToMatching(sel, filteredIds: number[]): SelectionState`

- [ ] **Step 1: Write the failing test**

Create `src/domain/selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  canSelectAllMatching, clearSelection, emptySelection, isSelected, keepAll,
  needsReconciliation, selectAllMatching, selectedCount, stillMatchingCount,
  toggleRow, toggleWindow, trimToMatching,
} from './selection'
import type { SelectionState } from './selection'

const SORTED = [10, 11, 12, 13, 14, 15]

const withIds = (ids: number[], over: Partial<SelectionState> = {}): SelectionState => ({
  ...emptySelection(), mode: 'ids', ids: new Set(ids), ...over,
})

const inAllMode = (ids: number[], snapCount: number): SelectionState => ({
  mode: 'all', ids: new Set(ids), snapCount, anchor: null, dismissKey: null,
})

describe('emptySelection', () => {
  it('starts empty in ids mode', () => {
    const sel = emptySelection()
    expect(sel.mode).toBe('ids')
    expect(selectedCount(sel)).toBe(0)
    expect(sel.dismissKey).toBeNull()
  })
})

describe('toggleRow — single click', () => {
  it('selects an unselected row', () => {
    const sel = toggleRow(emptySelection(), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(isSelected(sel, 12)).toBe(true)
    expect(selectedCount(sel)).toBe(1)
  })

  it('deselects a selected row', () => {
    const sel = toggleRow(withIds([12]), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(isSelected(sel, 12)).toBe(false)
  })

  it('records the clicked index as the anchor', () => {
    const sel = toggleRow(emptySelection(), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(sel.anchor).toBe(2)
  })

  it('does not mutate the previous state', () => {
    const before = emptySelection()
    toggleRow(before, { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(selectedCount(before)).toBe(0)
  })
})

describe('toggleRow — shift click', () => {
  it('selects the range from the anchor to the clicked row', () => {
    const anchored = toggleRow(emptySelection(), { id: 11, index: 1, shiftKey: false, sortedIds: SORTED })
    const ranged = toggleRow(anchored, { id: 14, index: 4, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([11, 12, 13, 14])
  })

  it('works when the range runs backwards', () => {
    const anchored = toggleRow(emptySelection(), { id: 14, index: 4, shiftKey: false, sortedIds: SORTED })
    const ranged = toggleRow(anchored, { id: 11, index: 1, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([11, 12, 13, 14])
  })

  it('applies the target row new state across the whole range, deselecting when the target was selected', () => {
    const all = withIds([10, 11, 12, 13, 14, 15], { anchor: 0 })
    const ranged = toggleRow(all, { id: 13, index: 3, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([14, 15])
  })

  it('falls back to a single toggle when there is no anchor', () => {
    const sel = toggleRow(emptySelection(), { id: 13, index: 3, shiftKey: true, sortedIds: SORTED })
    expect([...sel.ids]).toEqual([13])
  })
})

describe('toggleRow — materializing an all-mode selection', () => {
  it('drops to ids mode and keeps the snapshot as explicit ids', () => {
    const sel = toggleRow(inAllMode([10, 11, 12], 3), { id: 15, index: 5, shiftKey: false, sortedIds: SORTED })
    expect(sel.mode).toBe('ids')
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12, 15])
    expect(sel.snapCount).toBe(0)
  })

  it('deselecting inside an all-mode snapshot removes only that row', () => {
    const sel = toggleRow(inAllMode([10, 11, 12], 3), { id: 11, index: 1, shiftKey: false, sortedIds: SORTED })
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 12])
    expect(sel.mode).toBe('ids')
  })
})

describe('toggleWindow — the header checkbox', () => {
  it('selects every rendered row when not all are selected', () => {
    const sel = toggleWindow(withIds([10]), [10, 11, 12])
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12])
  })

  it('deselects every rendered row when all are already selected', () => {
    const sel = toggleWindow(withIds([10, 11, 12, 99]), [10, 11, 12])
    expect([...sel.ids]).toEqual([99])
  })

  it('never touches rows outside the rendered window', () => {
    const sel = toggleWindow(withIds([99]), [10, 11])
    expect(sel.ids.has(99)).toBe(true)
  })

  it('materializes an all-mode selection into ids mode', () => {
    const sel = toggleWindow(inAllMode([10, 11], 2), [12])
    expect(sel.mode).toBe('ids')
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12])
  })

  it('does nothing to an empty window', () => {
    const sel = toggleWindow(withIds([10]), [])
    expect([...sel.ids]).toEqual([10])
  })
})

describe('selectAllMatching', () => {
  it('enters all mode and snapshots the matching set with its count', () => {
    const sel = selectAllMatching(withIds([10]), [10, 11, 12, 13])
    expect(sel.mode).toBe('all')
    expect(sel.snapCount).toBe(4)
    expect(selectedCount(sel)).toBe(4)
  })
})

describe('canSelectAllMatching', () => {
  it('is offered for a partial selection in ids mode', () => {
    expect(canSelectAllMatching(withIds([10]), 100)).toBe(true)
  })

  it('is not offered with nothing selected', () => {
    expect(canSelectAllMatching(emptySelection(), 100)).toBe(false)
  })

  it('is not offered once every matching row is already selected', () => {
    expect(canSelectAllMatching(withIds([10, 11]), 2)).toBe(false)
  })

  it('is not offered while already in all mode', () => {
    expect(canSelectAllMatching(inAllMode([10, 11], 2), 100)).toBe(false)
  })
})

describe('needsReconciliation', () => {
  it('is false in ids mode however the filter changes', () => {
    expect(needsReconciliation(withIds([10]), 3, 'f2')).toBe(false)
  })

  it('is false while the match count still equals the snapshot count', () => {
    expect(needsReconciliation(inAllMode([10, 11, 12], 3), 3, 'f1')).toBe(false)
  })

  it('is true once the match count diverges from the snapshot', () => {
    expect(needsReconciliation(inAllMode([10, 11, 12], 3), 2, 'f2')).toBe(true)
  })

  it('is suppressed for the filter signature the user chose to keep', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(needsReconciliation(kept, 2, 'f2')).toBe(false)
  })

  it('re-arms when the filter changes again after a keep', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(needsReconciliation(kept, 1, 'f3')).toBe(true)
  })
})

describe('stillMatchingCount', () => {
  it('counts snapshot rows that survive the current filter', () => {
    expect(stillMatchingCount(inAllMode([10, 11, 12], 3), [11, 12, 20])).toBe(2)
  })
})

describe('keepAll', () => {
  it('stays in all mode and preserves the snapshot', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(kept.mode).toBe('all')
    expect(selectedCount(kept)).toBe(3)
  })
})

describe('trimToMatching', () => {
  it('intersects the snapshot with the current matches and returns to ids mode', () => {
    const trimmed = trimToMatching(inAllMode([10, 11, 12], 3), [11, 12, 20])
    expect(trimmed.mode).toBe('ids')
    expect([...trimmed.ids].sort((a, b) => a - b)).toEqual([11, 12])
    expect(trimmed.snapCount).toBe(0)
    expect(trimmed.dismissKey).toBeNull()
  })
})

describe('clearSelection', () => {
  it('returns an empty ids-mode selection', () => {
    expect(clearSelection()).toEqual(emptySelection())
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/domain/selection.test.ts`
Expected: FAIL — cannot resolve `./selection`.

- [ ] **Step 3: Implement the selection state machine**

Create `src/domain/selection.ts`:

```ts
export type SelMode = 'ids' | 'all'

export interface SelectionState {
  /** 'ids' holds an explicit selection. 'all' holds a snapshot of the matching set. */
  mode: SelMode
  ids: ReadonlySet<number>
  /** Match count at the moment "select all matching" was pressed. Zero in ids mode. */
  snapCount: number
  anchor: number | null
  /** Filter signature the user chose to keep a stale all-selection against. */
  dismissKey: string | null
}

export function emptySelection(): SelectionState {
  return { mode: 'ids', ids: new Set(), snapCount: 0, anchor: null, dismissKey: null }
}

export function clearSelection(): SelectionState {
  return emptySelection()
}

export function isSelected(sel: SelectionState, id: number): boolean {
  return sel.ids.has(id)
}

export function selectedCount(sel: SelectionState): number {
  return sel.ids.size
}

interface ToggleRowInput {
  id: number
  index: number
  shiftKey: boolean
  sortedIds: number[]
}

export function toggleRow(sel: SelectionState, input: ToggleRowInput): SelectionState {
  const { id, index, shiftKey, sortedIds } = input
  const ids = new Set(sel.ids)
  const target = !isSelected(sel, id)

  if (shiftKey && sel.anchor !== null) {
    const from = Math.min(sel.anchor, index)
    const to = Math.max(sel.anchor, index)
    for (let i = from; i <= to; i++) {
      const rowId = sortedIds[i]
      if (rowId === undefined) continue
      if (target) ids.add(rowId)
      else ids.delete(rowId)
    }
  } else if (target) {
    ids.add(id)
  } else {
    ids.delete(id)
  }

  return { mode: 'ids', ids, snapCount: 0, anchor: index, dismissKey: null }
}

export function toggleWindow(sel: SelectionState, windowIds: number[]): SelectionState {
  if (!windowIds.length) return sel
  const ids = new Set(sel.ids)
  const allSelected = windowIds.every((id) => ids.has(id))
  for (const id of windowIds) {
    if (allSelected) ids.delete(id)
    else ids.add(id)
  }
  return { ...sel, mode: 'ids', ids, snapCount: 0, dismissKey: null }
}

export function selectAllMatching(sel: SelectionState, matchingIds: number[]): SelectionState {
  return {
    mode: 'all',
    ids: new Set(matchingIds),
    snapCount: matchingIds.length,
    anchor: sel.anchor,
    dismissKey: null,
  }
}

export function canSelectAllMatching(sel: SelectionState, filteredCount: number): boolean {
  return sel.mode === 'ids' && sel.ids.size > 0 && sel.ids.size < filteredCount
}

export function needsReconciliation(
  sel: SelectionState,
  filteredCount: number,
  filterKey: string
): boolean {
  return (
    sel.mode === 'all' &&
    sel.snapCount > 0 &&
    filteredCount !== sel.snapCount &&
    sel.dismissKey !== filterKey
  )
}

export function stillMatchingCount(sel: SelectionState, filteredIds: number[]): number {
  let count = 0
  for (const id of filteredIds) if (sel.ids.has(id)) count++
  return count
}

export function keepAll(sel: SelectionState, filterKey: string): SelectionState {
  return { ...sel, dismissKey: filterKey }
}

export function trimToMatching(sel: SelectionState, filteredIds: number[]): SelectionState {
  const ids = new Set<number>()
  for (const id of filteredIds) if (sel.ids.has(id)) ids.add(id)
  return { mode: 'ids', ids, snapCount: 0, anchor: sel.anchor, dismissKey: null }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/domain/selection.test.ts`
Expected: PASS, every transition green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): add selection state machine with filter reconciliation"
```

---

### Task 6: Application state — reducer and the derivation hook

**Files:**
- Create: `src/state/reducer.ts`, `src/state/useFieldset.ts`
- Test: `src/state/reducer.test.ts`

**Interfaces:**
- Consumes: everything exported from `src/domain/*`.
- Produces:
  - `AppState`, `Action`, `initialState(): AppState`, `reducer(state, action): AppState`
  - `useFieldset(): { state; dispatch; rows; filtered; sorted; sortedIds; filterKey; ignoredCount; rowHeight; range }`

- [ ] **Step 1: Write the reducer state and action types**

Create `src/state/reducer.ts`:

```ts
import { COLS, NAME_COL_DEFAULT_WIDTH, getField, defaultOp } from '../domain/fields'
import {
  addCondition, addGroup, cloneTree, emptyTree, icpTree, patchCondition,
  removeNode, seedViews, toggleNodeOp,
} from '../domain/tree'
import {
  clearSelection, emptySelection, keepAll, selectAllMatching, toggleRow,
  toggleWindow, trimToMatching, type SelectionState,
} from '../domain/selection'
import { toggleSort } from '../domain/sort'
import type { Cond, CompanyKey, Density, Group, Phase, SavedView, SortSpec } from '../domain/types'

export interface AppState {
  phase: Phase
  dataN: number
  dataVersion: number
  tree: Group
  views: SavedView[]
  activeView: string | null
  sorts: SortSpec[]
  colOrder: CompanyKey[]
  hidden: Record<string, boolean>
  widths: Record<string, number>
  nameWidth: number
  selection: SelectionState
  scrollTop: number
  viewportHeight: number
  density: Density
  colMenuOpen: boolean
  savingView: boolean
  saveName: string
  toast: string | null
}

export type Action =
  | { type: 'load/start'; dataN: number }
  | { type: 'load/success' }
  | { type: 'load/error' }
  | { type: 'tree/addCondition'; parentId: string }
  | { type: 'tree/addGroup' }
  | { type: 'tree/patchCondition'; id: string; patch: Partial<Cond> }
  | { type: 'tree/removeNode'; id: string }
  | { type: 'tree/toggleOp'; id: string }
  | { type: 'tree/clear' }
  | { type: 'view/select'; viewId: string }
  | { type: 'view/startSave' }
  | { type: 'view/cancelSave' }
  | { type: 'view/setName'; name: string }
  | { type: 'view/confirmSave' }
  | { type: 'sort/toggle'; key: CompanyKey; append: boolean }
  | { type: 'columns/toggleVisible'; key: string }
  | { type: 'columns/move'; key: string; direction: -1 | 1 }
  | { type: 'columns/reorder'; from: string; to: string }
  | { type: 'columns/resize'; key: string; width: number }
  | { type: 'columns/setMenuOpen'; open: boolean }
  | { type: 'density/set'; density: Density }
  | { type: 'scroll/set'; scrollTop: number }
  | { type: 'viewport/set'; height: number }
  | { type: 'selection/toggleRow'; id: number; index: number; shiftKey: boolean; sortedIds: number[] }
  | { type: 'selection/toggleWindow'; windowIds: number[] }
  | { type: 'selection/selectAllMatching'; matchingIds: number[] }
  | { type: 'selection/clear' }
  | { type: 'selection/keep'; filterKey: string }
  | { type: 'selection/trim'; filteredIds: number[] }
  | { type: 'toast/show'; message: string }
  | { type: 'toast/hide' }

export function initialState(): AppState {
  return {
    phase: 'loading',
    dataN: 5000,
    dataVersion: 0,
    tree: icpTree(),
    views: seedViews(),
    activeView: 'v_icp',
    sorts: [{ key: 'revenue', dir: 'desc' }],
    colOrder: COLS.map((c) => c.key),
    hidden: {},
    widths: {},
    nameWidth: NAME_COL_DEFAULT_WIDTH,
    selection: emptySelection(),
    scrollTop: 0,
    viewportHeight: 600,
    density: 'Compact',
    colMenuOpen: false,
    savingView: false,
    saveName: '',
    toast: null,
  }
}

/** Editing the filter always detaches the active view and re-arms reconciliation. */
function afterTreeEdit(state: AppState, tree: Group): AppState {
  return {
    ...state,
    tree,
    activeView: null,
    selection: { ...state.selection, dismissKey: null },
  }
}
```

- [ ] **Step 2: Write the failing reducer test**

Create `src/state/reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { initialState, reducer, type AppState } from './reducer'
import { selectedCount } from '../domain/selection'
import type { Cond } from '../domain/types'

const ready = (over: Partial<AppState> = {}): AppState => ({
  ...initialState(), phase: 'ready', ...over,
})

describe('load lifecycle', () => {
  it('enters loading and records the requested size', () => {
    const s = reducer(ready(), { type: 'load/start', dataN: 50000 })
    expect(s.phase).toBe('loading')
    expect(s.dataN).toBe(50000)
  })

  it('clears the selection and scroll position when a new dataset is requested', () => {
    const before = ready({ scrollTop: 900 })
    const withSel = reducer(before, { type: 'selection/toggleWindow', windowIds: [1, 2] })
    const s = reducer(withSel, { type: 'load/start', dataN: 50000 })
    expect(selectedCount(s.selection)).toBe(0)
    expect(s.scrollTop).toBe(0)
  })

  it('bumps the data version on success so memos invalidate', () => {
    const s = reducer(ready(), { type: 'load/success' })
    expect(s.phase).toBe('ready')
    expect(s.dataVersion).toBe(1)
  })

  it('enters the error phase', () => {
    expect(reducer(ready(), { type: 'load/error' }).phase).toBe('error')
  })
})

describe('tree editing', () => {
  it('detaches the active view when a condition is added', () => {
    const s = reducer(ready(), { type: 'tree/addCondition', parentId: 'root' })
    expect(s.activeView).toBeNull()
    expect(s.tree.children).toHaveLength(4)
  })

  it('detaches the active view when a condition is patched', () => {
    const id = ready().tree.children[0].id
    const s = reducer(ready(), { type: 'tree/patchCondition', id, patch: { value: 'Fintech' } })
    expect(s.activeView).toBeNull()
    expect((s.tree.children[0] as Cond).value).toBe('Fintech')
  })

  it('clearing filters selects the All companies view', () => {
    const s = reducer(ready(), { type: 'tree/clear' })
    expect(s.tree.children).toHaveLength(0)
    expect(s.activeView).toBe('v_all')
  })
})

describe('view selection', () => {
  it('activates the view and adopts a copy of its tree', () => {
    const s = reducer(ready(), { type: 'view/select', viewId: 'v_legacy' })
    expect(s.activeView).toBe('v_legacy')
    expect(JSON.stringify(s.tree)).toContain('region_emea')
  })

  it('never lets an edit reach back into the saved view', () => {
    const selected = reducer(ready(), { type: 'view/select', viewId: 'v_icp' })
    const edited = reducer(selected, {
      type: 'tree/patchCondition', id: selected.tree.children[0].id, patch: { value: 'Fintech' },
    })
    const saved = edited.views.find((v) => v.id === 'v_icp')!
    expect((saved.tree.children[0] as Cond).value).toBe('SaaS')
  })

  it('saves the current tree as a new active view', () => {
    const naming = reducer(ready(), { type: 'view/setName', name: 'My view' })
    const s = reducer({ ...naming, savingView: true }, { type: 'view/confirmSave' })
    expect(s.views.at(-1)!.name).toBe('My view')
    expect(s.activeView).toBe(s.views.at(-1)!.id)
    expect(s.savingView).toBe(false)
  })

  it('falls back to Untitled view for a blank name', () => {
    const s = reducer({ ...ready(), savingView: true, saveName: '   ' }, { type: 'view/confirmSave' })
    expect(s.views.at(-1)!.name).toBe('Untitled view')
  })

  it('snapshots the tree so later edits do not alter the saved view', () => {
    const saved = reducer({ ...ready(), savingView: true, saveName: 'Snap' }, { type: 'view/confirmSave' })
    const edited = reducer(saved, {
      type: 'tree/patchCondition', id: saved.tree.children[0].id, patch: { value: 'Fintech' },
    })
    expect((edited.views.at(-1)!.tree.children[0] as Cond).value).toBe('SaaS')
  })
})

describe('columns', () => {
  it('hides and shows a column', () => {
    const hidden = reducer(ready(), { type: 'columns/toggleVisible', key: 'stage' })
    expect(hidden.hidden.stage).toBe(true)
    expect(reducer(hidden, { type: 'columns/toggleVisible', key: 'stage' }).hidden.stage).toBe(false)
  })

  it('moves a column up and refuses to move the first one further', () => {
    const s = reducer(ready(), { type: 'columns/move', key: 'stage', direction: -1 })
    expect(s.colOrder[0]).toBe('stage')
    expect(reducer(s, { type: 'columns/move', key: 'stage', direction: -1 }).colOrder[0]).toBe('stage')
  })

  it('reorders by dropping one column onto another', () => {
    const s = reducer(ready(), { type: 'columns/reorder', from: 'owner', to: 'industry' })
    expect(s.colOrder[0]).toBe('owner')
  })

  it('enforces the minimum column width', () => {
    expect(reducer(ready(), { type: 'columns/resize', key: 'stage', width: 10 }).widths.stage).toBe(70)
  })

  it('resizes the sticky company column separately', () => {
    expect(reducer(ready(), { type: 'columns/resize', key: '__name', width: 300 }).nameWidth).toBe(300)
  })
})

describe('sorting', () => {
  it('appends a sort on shift click', () => {
    const s = reducer(ready(), { type: 'sort/toggle', key: 'name', append: true })
    expect(s.sorts).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run src/state/reducer.test.ts`
Expected: FAIL — `reducer` is not exported.

- [ ] **Step 4: Implement the reducer**

Append to `src/state/reducer.ts`:

```ts
const MIN_COL_WIDTH = 70

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load/start':
      return {
        ...state,
        phase: 'loading',
        dataN: action.dataN,
        scrollTop: 0,
        selection: clearSelection(),
      }
    case 'load/success':
      return { ...state, phase: 'ready', dataVersion: state.dataVersion + 1 }
    case 'load/error':
      return { ...state, phase: 'error' }

    case 'tree/addCondition':
      return afterTreeEdit(state, addCondition(state.tree, action.parentId))
    case 'tree/addGroup':
      return afterTreeEdit(state, addGroup(state.tree))
    case 'tree/patchCondition':
      return afterTreeEdit(state, patchCondition(state.tree, action.id, action.patch))
    case 'tree/removeNode':
      return afterTreeEdit(state, removeNode(state.tree, action.id))
    case 'tree/toggleOp':
      return afterTreeEdit(state, toggleNodeOp(state.tree, action.id))
    case 'tree/clear':
      return { ...afterTreeEdit(state, emptyTree()), activeView: 'v_all' }

    case 'view/select': {
      const view = state.views.find((v) => v.id === action.viewId)
      if (!view) return state
      return {
        ...state,
        tree: cloneTree(view.tree),
        activeView: view.id,
        selection: { ...state.selection, dismissKey: null },
      }
    }
    case 'view/startSave':
      return { ...state, savingView: true, saveName: '' }
    case 'view/cancelSave':
      return { ...state, savingView: false }
    case 'view/setName':
      return { ...state, saveName: action.name }
    case 'view/confirmSave': {
      const name = state.saveName.trim() || 'Untitled view'
      const id = `v_${Date.now()}_${state.views.length}`
      return {
        ...state,
        views: [...state.views, { id, name, tree: cloneTree(state.tree) }],
        activeView: id,
        savingView: false,
        saveName: '',
        toast: `View “${name}” saved`,
      }
    }

    case 'sort/toggle':
      return { ...state, sorts: toggleSort(state.sorts, action.key, action.append) }

    case 'columns/toggleVisible':
      return { ...state, hidden: { ...state.hidden, [action.key]: !state.hidden[action.key] } }
    case 'columns/move': {
      const order = state.colOrder.slice()
      const i = order.indexOf(action.key as CompanyKey)
      const j = i + action.direction
      if (i < 0 || j < 0 || j >= order.length) return state
      ;[order[i], order[j]] = [order[j], order[i]]
      return { ...state, colOrder: order }
    }
    case 'columns/reorder': {
      if (action.from === action.to) return state
      const order = state.colOrder.filter((k) => k !== action.from)
      const at = order.indexOf(action.to as CompanyKey)
      if (at < 0) return state
      order.splice(at, 0, action.from as CompanyKey)
      return { ...state, colOrder: order }
    }
    case 'columns/resize': {
      const width = Math.max(MIN_COL_WIDTH, action.width)
      if (action.key === '__name') return { ...state, nameWidth: width }
      return { ...state, widths: { ...state.widths, [action.key]: width } }
    }
    case 'columns/setMenuOpen':
      return { ...state, colMenuOpen: action.open }

    case 'density/set':
      return { ...state, density: action.density }
    case 'scroll/set':
      return { ...state, scrollTop: action.scrollTop }
    case 'viewport/set':
      return state.viewportHeight === action.height ? state : { ...state, viewportHeight: action.height }

    case 'selection/toggleRow':
      return {
        ...state,
        selection: toggleRow(state.selection, {
          id: action.id, index: action.index, shiftKey: action.shiftKey, sortedIds: action.sortedIds,
        }),
      }
    case 'selection/toggleWindow':
      return { ...state, selection: toggleWindow(state.selection, action.windowIds) }
    case 'selection/selectAllMatching':
      return { ...state, selection: selectAllMatching(state.selection, action.matchingIds) }
    case 'selection/clear':
      return { ...state, selection: clearSelection() }
    case 'selection/keep':
      return { ...state, selection: keepAll(state.selection, action.filterKey) }
    case 'selection/trim':
      return { ...state, selection: trimToMatching(state.selection, action.filteredIds) }

    case 'toast/show':
      return { ...state, toast: action.message }
    case 'toast/hide':
      return { ...state, toast: null }
  }
}

/** Field changes reset the operator and re-seed the value for the new type. */
export function fieldChangePatch(nextFieldKey: string): Partial<Cond> {
  const field = getField(nextFieldKey)
  if (!field) return { field: nextFieldKey, op: 'is', value: '', value2: '' }
  return {
    field: nextFieldKey,
    op: defaultOp(field.type),
    value: field.type === 'enum' ? (field.options?.[0] ?? '') : '',
    value2: '',
  }
}

/** Switching to or from a multi-select operator wraps or unwraps the value. */
export function opChangePatch(cond: Cond, nextOp: Cond['op'], fieldKey: string): Partial<Cond> {
  const multi = nextOp === 'any_of' || nextOp === 'not_any_of'
  const wasMulti = Array.isArray(cond.value)
  if (multi && !wasMulti) return { op: nextOp, value: cond.value ? [cond.value as string] : [] }
  if (!multi && wasMulti) {
    const first = (cond.value as string[])[0]
    const fallback = getField(fieldKey)?.options?.[0] ?? ''
    return { op: nextOp, value: first ?? fallback }
  }
  return { op: nextOp }
}
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `npx vitest run src/state/reducer.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement the derivation hook**

Create `src/state/useFieldset.ts`. This is where memoization and the load effect live — the
only place `Date.now()` is read.

```ts
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { filterRows, countIgnoredConditions } from '../domain/filter'
import { generateCompanies } from '../domain/generateCompanies'
import { sortRows } from '../domain/sort'
import { computeWindow } from '../domain/virtual'
import { ROW_HEIGHT, type Company } from '../domain/types'
import { initialState, reducer } from './reducer'

const LOAD_MS: Record<number, number> = { 5000: 700, 50000: 1100 }

export function useFieldset() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const rowsRef = useRef<Company[]>([])
  const nowRef = useRef(Date.now())

  useEffect(() => {
    if (state.phase !== 'loading') return
    const delay = LOAD_MS[state.dataN] ?? 900
    const timer = setTimeout(() => {
      nowRef.current = Date.now()
      rowsRef.current = generateCompanies(state.dataN, { now: nowRef.current })
      dispatch({ type: 'load/success' })
    }, delay)
    return () => clearTimeout(timer)
  }, [state.phase, state.dataN])

  useEffect(() => {
    if (!state.toast) return
    const timer = setTimeout(() => dispatch({ type: 'toast/hide' }), 2600)
    return () => clearTimeout(timer)
  }, [state.toast])

  const rows = rowsRef.current
  const filterKey = useMemo(
    () => `${state.dataVersion}|${JSON.stringify(state.tree)}`,
    [state.dataVersion, state.tree]
  )

  const filtered = useMemo(
    () => (state.phase === 'ready' ? filterRows(rows, state.tree, nowRef.current) : []),
    // filterKey encodes both dependencies; rows changes only with dataVersion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, state.phase]
  )

  const sorted = useMemo(() => sortRows(filtered, state.sorts), [filtered, state.sorts])
  const sortedIds = useMemo(() => sorted.map((r) => r.id), [sorted])
  const ignoredCount = useMemo(() => countIgnoredConditions(state.tree), [state.tree])

  const rowHeight = ROW_HEIGHT[state.density]
  const range = useMemo(
    () => computeWindow({
      count: sorted.length,
      rowHeight,
      viewportHeight: state.viewportHeight,
      scrollTop: state.scrollTop,
    }),
    [sorted.length, rowHeight, state.viewportHeight, state.scrollTop]
  )

  return { state, dispatch, rows, filtered, sorted, sortedIds, filterKey, ignoredCount, rowHeight, range, now: nowRef.current }
}
```

- [ ] **Step 7: Verify**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(state): add typed reducer and memoized derivation hook"
```

---

### Task 7: App shell, top bar, status bar

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.module.css`
- Create: `src/components/TopBar/TopBar.tsx`, `TopBar.module.css`, `SegmentedControl.tsx`, `SegmentedControl.module.css`, `ViewChips.tsx`, `ColumnsMenu.tsx`, `ColumnsMenu.module.css`
- Create: `src/components/StatusBar/StatusBar.tsx`, `StatusBar.module.css`
- Test: `src/components/TopBar/TopBar.test.tsx`

**Reference:** `design_handoff_fieldset/Fieldset.dc.html:58-108` (top bar and columns menu).

**Interfaces:**
- Consumes: `useFieldset()` from `../state/useFieldset`; `COLS`, `getColumn` from `../domain/fields`.
- Produces:
  - `<App />`
  - `<TopBar state dispatch />`
  - `<SegmentedControl options={[{value,label,title?}]} value onChange />`
  - `<ViewChips views activeView onSelect />`
  - `<ColumnsMenu colOrder hidden onToggle onMove onClose />`
  - `<StatusBar rowCount sortSummary />`

- [ ] **Step 1: Build the shell layout**

`src/App.tsx` renders, in order: `TopBar`, `FilterPanel` (placeholder for now), `ReconciliationBanner`
(placeholder), the table area, `StatusBar`. Root element uses `App.module.css`:

```css
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  background: var(--surface-page);
  overflow: hidden;
}
```

Note `height: 100%`, never `100vh` — the app must fill an iframe as readily as the viewport.
A click on the root dispatches `columns/setMenuOpen: false` so the columns dropdown closes on
outside click; the menu itself stops propagation.

- [ ] **Step 2: Build `SegmentedControl`**

Shared by the 5k/50k and S/M/L controls. Exact values: wrapper `display:flex; flex:none;
border:1px solid var(--border-strong); border-radius:7px`. Buttons `height:26px; padding:0 9px;
border:none; cursor:pointer; font-size:11.5px`. Every button after the first gets
`border-left:1px solid var(--border-strong)`. First button `border-radius:6px 0 0 6px`, last
`border-radius:0 6px 6px 0`. Active button `background:var(--dark-bg); color:#fff`; inactive
`background:#fff; color:var(--ink-4)`. The 5k/50k variant additionally sets
`font-family:var(--font-mono)`.

Accessibility, additive to the handoff: render as `role="group"` with an `aria-label`, and give
each button `aria-pressed`.

- [ ] **Step 3: Build the top bar**

Layout: `min-height:52px; flex:none; display:flex; align-items:center; flex-wrap:wrap;
row-gap:4px; gap:12px; padding:6px 16px; background:var(--surface-panel);
border-bottom:1px solid var(--border-strong); position:relative; z-index:60`.

Contents left to right: logo (22px square, `background:var(--accent)`, `border-radius:6px`,
white mono 12px/700 "F") plus wordmark ("Fieldset", 15px/700, `letter-spacing:-0.01em`); a
1px × 20px `var(--border-strong)` divider; `ViewChips`; a `flex:1` spacer; the mono "demo"
label (10.5px, `var(--ink-5)`, uppercase, `letter-spacing:0.08em`); the 5k/50k
`SegmentedControl`; the "break it" button; a divider; the S/M/L `SegmentedControl`; the
"Columns ▾" button.

The "break it" button is `height:28px; padding:0 10px; border-radius:7px; border:1px solid
var(--border-strong); background:#fff; color:var(--ink-4); font-size:12px`, with a hover state
of `color:var(--error-text); border-color:var(--error-border)`. It dispatches `load/error`.

- [ ] **Step 4: Build `ViewChips`**

Each chip: `height:28px; padding:0 11px; border-radius:7px; font-size:12.5px; font-weight:500;
white-space:nowrap; display:flex; align-items:center; gap:5px`. Active chip
`background:var(--accent-tint-1); border:1px solid var(--accent-border); color:var(--accent)`;
inactive `background:#fff; border:1px solid var(--border-strong); color:var(--ink-3)`. A view
with `warn` renders a trailing `<span>` "!" in `var(--amber-mark)` at `font-weight:700`, with
`aria-label="references a deleted field"` so the warning is not colour-only.

- [ ] **Step 5: Build `ColumnsMenu`**

Dropdown: `position:absolute; top:48px; right:16px; width:236px; background:#fff;
border:1px solid var(--border-strong); border-radius:var(--radius-surface);
box-shadow:var(--shadow-menu); padding:6px; z-index:100`. Header row: mono 10.5px uppercase
`letter-spacing:0.08em` `var(--ink-5)`, padding `6px 8px`, text "show / hide · reorder". Each
row: `display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px`, hover
`background:var(--surface-page)`, containing a checkbox (`accent-color:var(--accent)`) with an
accessible label naming the column, the column label, a `flex:1` spacer, and ↑ / ↓ buttons
dispatching `columns/move`.

- [ ] **Step 6: Build `StatusBar`**

`height:28px; flex:none; background:var(--surface-header); border-top:1px solid
var(--border-strong); display:flex; align-items:center; gap:14px; padding:0 16px;
font-family:var(--font-mono); font-size:10.5px; color:var(--ink-5)`. Left: `"{n} rows ·
virtualized"`. Middle: `"sort: {summary}"` where summary joins each sort as `"{key} {dir}"`
with `", "`, or `"none"` when there are no sorts. Right (pushed by a `flex:1` spacer):
"fieldset — a filter & table edge-case study".

- [ ] **Step 7: Write the top bar test**

Create `src/components/TopBar/TopBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'
import { initialState } from '../../state/reducer'

const setup = () => {
  const dispatch = vi.fn()
  render(<TopBar state={{ ...initialState(), phase: 'ready' }} dispatch={dispatch} />)
  return { dispatch, user: userEvent.setup() }
}

describe('TopBar', () => {
  it('renders every seeded view as a chip', () => {
    setup()
    expect(screen.getByRole('button', { name: /All companies/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /EMEA legacy/ })).toBeInTheDocument()
  })

  it('marks the active view as pressed', () => {
    setup()
    expect(screen.getByRole('button', { name: /ICP · Mid-market SaaS/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('labels the deleted-field warning for screen readers rather than by colour alone', () => {
    setup()
    const chip = screen.getByRole('button', { name: /EMEA legacy/ })
    expect(chip).toHaveTextContent('!')
    expect(chip.querySelector('[aria-label="references a deleted field"]')).not.toBeNull()
  })

  it('selects a view on click', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /All companies/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/select', viewId: 'v_all' })
  })

  it('requests the 50k dataset', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: '50k' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'load/start', dataN: 50000 })
  })

  it('forces the error state from "break it"', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /break it/i }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'load/error' })
  })

  it('opens and closes the columns menu', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Columns/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'columns/setMenuOpen', open: true })
  })

  it('changes density', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Spacious' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'density/set', density: 'Spacious' })
  })
})
```

- [ ] **Step 8: Run the test, then implement until it passes**

Run: `npx vitest run src/components/TopBar/TopBar.test.tsx`
Expected: FAIL first, then PASS after the components exist.

- [ ] **Step 9: Compare against the reference**

Run `npm run dev`, open the app beside `design_handoff_fieldset/Fieldset.dc.html` in the
browser, and check the top bar and status bar match: control heights, chip colours, divider
positions, mono label spacing.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(ui): add app shell, top bar and status bar"
```

---

### Task 8: Filter panel

**Files:**
- Create: `src/components/FilterPanel/FilterPanel.tsx`, `FilterPanel.module.css`
- Create: `src/components/FilterPanel/MatchCount.tsx`, `ConditionRow.tsx`, `ConditionRow.module.css`, `GroupRow.tsx`, `GroupRow.module.css`, `ValueEditor.tsx`, `EnumChips.tsx`, `SaveViewInline.tsx`
- Test: `src/components/FilterPanel/FilterPanel.test.tsx`

**Reference:** `design_handoff_fieldset/Fieldset.dc.html:110-190`.

**Interfaces:**
- Consumes: `FIELDS`, `OPS`, `getField` from `../../domain/fields`; `conditionHits` from
  `../../domain/filter`; `fieldChangePatch`, `opChangePatch` from `../../state/reducer`.
- Produces:
  - `<FilterPanel state dispatch rows filtered ignoredCount now />`
  - `<ConditionRow cond parentId isFirst joinerOp small hits dispatch />`
  - `<ValueEditor cond field dispatch small />`

- [ ] **Step 1: Build the panel frame and match count**

Panel: `background:var(--surface-panel); flex:none; padding:12px 16px 14px;
border-bottom:1px solid var(--border-strong)`.

Match count line: the count in `font-family:var(--font-mono); font-size:19px; font-weight:600`,
followed by `"of {total} match"` at 12.5px `var(--ink-4)`. When `ignoredCount > 0`, append
`"{n} condition(s) ignored (deleted field)"` in `var(--amber-text)` at 12.5px. Right-aligned
"Save as view" button: `background:var(--accent-tint-2); border:1px solid
var(--accent-border-soft); color:var(--accent); font-size:12.5px; font-weight:600`.

- [ ] **Step 2: Build the joiner slot and condition box**

Rows stack vertically with `gap:7px`. Each row has a leading 44px slot: on the first row the
word "Where" at 12px `var(--ink-5)`; on later rows an AND/OR pill, `44px × 26px`,
`background:var(--accent-tint-2); border:1px solid var(--accent-border-soft);
color:var(--accent); font-family:var(--font-mono); font-size:10.5px; font-weight:600`.
Clicking the pill dispatches `tree/toggleOp` with the **root** id — it flips the whole root
operator, matching the handoff.

Condition box: `display:inline-flex; flex-wrap:wrap; align-items:center; gap:5px;
padding:4px 6px; border:1px solid var(--border-condition); background:#fdfdfe;
border-radius:var(--radius-control-lg)`. Inputs and selects inside: `height:26px`
(`24px` when `small`), `border-radius:var(--radius-control); border:1px solid
var(--border-strong); background:var(--surface-input)`. Numeric and date inputs use
`font-family:var(--font-mono)`.

**Hit counts must be memoized.** A naive implementation calls `conditionHits` during every
render for every condition, scanning the full dataset each time — at 50k rows this is the
port's one real performance hazard (spec section 8, defect 4). Compute them once per render
pass in `FilterPanel` with a `useMemo` keyed on `(dataVersion, JSON.stringify(tree))`, walking
the tree to produce a `Record<condId, number>`, and pass each count down to its `ConditionRow`:

```ts
const hitCounts = useMemo(() => {
  const counts: Record<string, number> = {}
  const visit = (node: TreeNode) => {
    if (node.kind === 'group') node.children.forEach(visit)
    else if (getField(node.field)) counts[node.id] = conditionHits(rows, node, now)
  }
  state.tree.children.forEach(visit)
  return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state.dataVersion, JSON.stringify(state.tree), rows, now])
```

Trailing elements: the live hit count in mono 11px `var(--ink-6)` reading `"{n} hits"`
(singular "1 hit"), then a × remove button whose colour goes to `var(--error-text)` on hover.
Give the remove button `aria-label={`Remove condition on ${fieldLabel}`}`.

- [ ] **Step 3: Handle the deleted-field condition**

When `getField(cond.field)` is undefined the box switches to `border:1px solid
var(--amber-border); background:var(--amber-bg)`, renders the text "field was deleted —
condition ignored" in `var(--amber-text)`, offers only the remove button, and shows no
operator, value or hit count. The field `<select>` still lists the dead key first as
`"{key} (deleted)"` so the user can repoint it.

- [ ] **Step 4: Build `ValueEditor`**

Chooses the editor from field type and operator, exactly as the handoff does:

| Condition | Editor |
|---|---|
| `boolean` type, or op is `empty` / `last30` / `last90` | none |
| `text` | one text input |
| `number` | one numeric input; a second when op is `between` |
| `date` | one date input; a second when op is `between` |
| `enum` with op `is` / `is_not` | a `<select>` of the field's options |
| `enum` with op `any_of` / `not_any_of` | `EnumChips` |

`EnumChips` renders one 24px pill per option, fully rounded. Selected:
`background:var(--accent-tint-1); border:1px solid var(--accent-border); color:var(--accent);
font-weight:600`. Unselected: `background:#fff; border:1px solid var(--border-strong);
color:var(--ink-4); font-weight:400`. Each pill is a `<button aria-pressed>`.

Changing the field dispatches `tree/patchCondition` with `fieldChangePatch(nextKey)`; changing
the operator dispatches it with `opChangePatch(cond, nextOp, cond.field)`.

- [ ] **Step 5: Build `GroupRow`**

Group box: `border:1px solid var(--border-strong); border-left:3px solid var(--accent-border);
background:var(--surface-group); border-radius:var(--radius-control-lg); padding:8px 10px`.
Header: mono uppercase "group · match" label in `var(--ink-5)`, an ALL ( AND ) / ANY ( OR )
toggle pill dispatching `tree/toggleOp` with the group's id, and a × remove button. Children
render as `ConditionRow` with `small` set, joined by mono joiner labels. A "+ condition"
link-button at the bottom dispatches `tree/addCondition` with the group's id.

- [ ] **Step 6: Build the footer**

Two dashed buttons: "+ Condition" and "+ Group ( OR )", `border:1px dashed var(--border-dashed);
color:var(--accent); background:transparent`, hover `background:var(--accent-tint-3)`. They
dispatch `tree/addCondition` with `parentId: 'root'` and `tree/addGroup`.

- [ ] **Step 7: Build `SaveViewInline`**

"Save as view" swaps the button for an inline text input plus Save and Cancel buttons, wired to
`view/setName`, `view/confirmSave` and `view/cancelSave`. The input is autofocused and submits
on Enter.

- [ ] **Step 8: Write the filter panel test**

Create `src/components/FilterPanel/FilterPanel.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterPanel } from './FilterPanel'
import { initialState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { filterRows } from '../../domain/filter'
import { emptyTree } from '../../domain/tree'
import type { AppState } from '../../state/reducer'
import type { Group } from '../../domain/types'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(200, { now: NOW })

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const state = { ...initialState(), phase: 'ready' as const, ...over }
  render(
    <FilterPanel
      state={state}
      dispatch={dispatch}
      rows={ROWS}
      filtered={filterRows(ROWS, state.tree, NOW)}
      ignoredCount={0}
      now={NOW}
    />
  )
  return { dispatch, state, user: userEvent.setup() }
}

const legacyTree = (): Group => ({
  kind: 'group', id: 'root', op: 'AND',
  children: [{ kind: 'cond', id: 'c_dead', field: 'region_emea', op: 'is', value: 'EMEA', value2: '' }],
})

describe('FilterPanel structure', () => {
  it('labels the first row Where and later rows with the joiner', () => {
    setup()
    expect(screen.getByText('Where')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'AND' }).length).toBeGreaterThan(0)
  })

  it('adds a condition to the root', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /\+ Condition/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/addCondition', parentId: 'root' })
  })

  it('adds a group', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /\+ Group/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/addGroup' })
  })

  it('flips the root operator from the joiner pill', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getAllByRole('button', { name: 'AND' })[0])
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/toggleOp', id: 'root' })
  })
})

describe('FilterPanel condition editing', () => {
  it('resets the operator and re-seeds the value when the field changes', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.selectOptions(screen.getAllByLabelText('Field')[0], 'headcount')
    expect(dispatch).toHaveBeenCalledWith({
      type: 'tree/patchCondition', id,
      patch: { field: 'headcount', op: 'gt', value: '', value2: '' },
    })
  })

  it('wraps the value into an array when switching to is any of', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.selectOptions(screen.getAllByLabelText('Operator')[0], 'any_of')
    expect(dispatch).toHaveBeenCalledWith({
      type: 'tree/patchCondition', id, patch: { op: 'any_of', value: ['SaaS'] },
    })
  })

  it('shows a second input only for a between range', () => {
    const tree: Group = {
      kind: 'group', id: 'root', op: 'AND',
      children: [{ kind: 'cond', id: 'c1', field: 'headcount', op: 'between', value: '10', value2: '20' }],
    }
    setup({ tree })
    expect(screen.getAllByLabelText(/Value/)).toHaveLength(2)
  })

  it('shows no value input for a boolean condition', () => {
    const tree: Group = {
      kind: 'group', id: 'root', op: 'AND',
      children: [{ kind: 'cond', id: 'c1', field: 'inCRM', op: 'true', value: '', value2: '' }],
    }
    setup({ tree })
    expect(screen.queryByLabelText(/Value/)).toBeNull()
  })

  it('reports a live hit count for each condition', () => {
    const tree: Group = {
      kind: 'group', id: 'root', op: 'AND',
      children: [{ kind: 'cond', id: 'c1', field: 'industry', op: 'is', value: 'SaaS', value2: '' }],
    }
    setup({ tree })
    expect(screen.getByText(/\d+ hits?$/)).toBeInTheDocument()
  })

  it('removes a condition', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.click(screen.getAllByRole('button', { name: /Remove condition/ })[0])
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/removeNode', id })
  })
})

describe('FilterPanel deleted field', () => {
  it('explains that the condition is ignored rather than failing', () => {
    setup({ tree: legacyTree() })
    expect(screen.getByText(/field was deleted — condition ignored/)).toBeInTheDocument()
  })

  it('offers no operator or value editor for a dead condition', () => {
    setup({ tree: legacyTree() })
    expect(screen.queryByLabelText('Operator')).toBeNull()
    expect(screen.queryByLabelText(/Value/)).toBeNull()
  })

  it('surfaces the ignored count beside the match count', () => {
    const dispatch = vi.fn()
    render(
      <FilterPanel
        state={{ ...initialState(), phase: 'ready', tree: legacyTree() }}
        dispatch={dispatch}
        rows={ROWS}
        filtered={ROWS}
        ignoredCount={1}
        now={NOW}
      />
    )
    expect(screen.getByText('1 condition ignored (deleted field)')).toBeInTheDocument()
  })
})

describe('FilterPanel saving a view', () => {
  it('swaps the button for a name input and saves', async () => {
    const { dispatch, user } = setup({ savingView: true, saveName: 'My view' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmSave' })
  })

  it('cancels without saving', async () => {
    const { dispatch, user } = setup({ savingView: true })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/cancelSave' })
  })
})

describe('FilterPanel empty tree', () => {
  it('renders the footer actions with no conditions', () => {
    setup({ tree: emptyTree() })
    expect(screen.getByRole('button', { name: /\+ Condition/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 9: Run the test, implement until green**

Run: `npx vitest run src/components/FilterPanel`
Expected: FAIL first, then PASS.

- [ ] **Step 10: Verify against the reference and commit**

Compare the panel side by side with the prototype at all three densities, then:

```bash
git add -A
git commit -m "feat(ui): add filter panel with nested groups and deleted-field degradation"
```

---

### Task 9: Table — virtualization, sorting, column resize and reorder

**Files:**
- Create: `src/components/Table/Table.tsx`, `Table.module.css`
- Create: `src/components/Table/TableHeader.tsx`, `TableRow.tsx`, `TableCell.tsx`, `CrmBadge.tsx`
- Create: `src/hooks/useRafScroll.ts`, `src/hooks/useColumnResize.ts`
- Note: spec section 4 lists a `useColumnDrag.ts`. Drag reordering turned out to be three
  native HTML5 handlers with no state of its own, so it lives inline in `TableHeader.tsx` and
  that file is not created. This is the only deviation from the spec's file list.
- Test: `src/components/Table/Table.test.tsx`

**Reference:** `design_handoff_fieldset/Fieldset.dc.html:192-280`.

**Interfaces:**
- Consumes: `computeWindow` (already applied in `useFieldset`), `COLS`, `getColumn`,
  `NAME_COL_DEFAULT_WIDTH`, `formatNumber`, `formatDate`, `isSelected`.
- Produces:
  - `<Table state dispatch sorted sortedIds range rowHeight />` — the virtual range prop is named
    `range`, never `window`, so it cannot shadow the global that `useColumnResize` listens on
  - `useRafScroll(onScroll: (top: number) => void)` returning an `onScroll` handler
  - `useColumnResize(dispatch)` returning `startResize(key, event)`

- [ ] **Step 1: Build the scroll container and measurement**

The scroll container is `flex:1; overflow:auto; background:#fff; position:relative`. Its height
is measured with a `ResizeObserver` — never from `window.innerHeight`, because the app may be
embedded in an iframe. On resize, dispatch `viewport/set`. The reducer already no-ops when the
height is unchanged, so this cannot loop.

- [ ] **Step 2: Build `useRafScroll`**

```ts
import { useCallback, useEffect, useRef } from 'react'

export function useRafScroll(onScroll: (top: number) => void) {
  const frame = useRef<number | null>(null)
  const latest = useRef(0)

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  return useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      latest.current = event.currentTarget.scrollTop
      if (frame.current !== null) return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        onScroll(latest.current)
      })
    },
    [onScroll]
  )
}
```

- [ ] **Step 3: Render the virtual window**

Inside the scroll container: a top spacer `div` of `height: range.topPad`, the rendered rows
from `sorted.slice(range.start, range.end)`, then a bottom spacer of `height: range.botPad`.
Each row gets `style={{ height: rowHeight }}`. Row heights come from `ROW_HEIGHT[density]` and
must be exactly 32 / 40 / 50.

- [ ] **Step 4: Build the sticky header**

Header row: `height:34px; position:sticky; top:0; z-index:20;
background:var(--surface-header); border-bottom:1px solid var(--border-strong);
display:flex; font-size:12px; font-weight:600; color:var(--ink-3)`.

The first two columns are sticky horizontally: the 40px checkbox column at `left:0`, and the
Company column at `left:40px` with width `state.nameWidth` (default 220). Both carry
`border-right:1px solid var(--border-strong)` and an opaque background so rows scroll beneath
them.

Each sortable header cell is a `<button>` inside a `<div role="columnheader">` carrying
`aria-sort` of `ascending`, `descending` or `none`. Clicking dispatches `sort/toggle` with
`append: event.shiftKey`. The sort glyph is `↑` or `↓` followed by the 1-based priority number
when more than one sort is active, rendered in `font-family:var(--font-mono); color:var(--accent)`.

- [ ] **Step 5: Build column resize and drag reorder**

`useColumnResize` attaches `mousemove` and `mouseup` listeners to `window` on mousedown of the
7px right-edge handle, dispatching `columns/resize` with `startWidth + (clientX - startX)`.
The reducer clamps to 70px. The handle is `position:absolute; right:0; top:0; bottom:0;
width:7px; cursor:col-resize`, and calls `preventDefault` and `stopPropagation` so it never
triggers a sort. The sticky Company column resizes under the key `__name`.

Header cells are `draggable`, setting `dataTransfer.effectAllowed='move'` and stashing the
dragged key; `onDragOver` calls `preventDefault`; `onDrop` dispatches `columns/reorder`.

- [ ] **Step 6: Build rows and cells**

Row: `display:flex; border-bottom:1px solid var(--border-row)`. Background precedence, highest
first: selected `var(--accent-tint-1)`, hover `var(--surface-hover)`, zebra on odd absolute
index `var(--surface-zebra)`, otherwise `#fff`. Note the zebra index is the row's index in the
sorted array, not its index within the rendered window — otherwise stripes flicker while
scrolling.

Cell: `font-size:12.5px; padding:0 10px; display:flex; align-items:center; overflow:hidden;
white-space:nowrap; text-overflow:ellipsis`. Columns marked `mono` use
`font-family:var(--font-mono); font-size:12px; color:var(--ink-2)`; those marked `right` use
`justify-content:flex-end`.

Cell formatting: `headcount` through `formatNumber`; `revenue` as `` `$${revenue}M` ``;
`founded` and `lastActivity` through `formatDate`; `inCRM` as a `CrmBadge`.

`CrmBadge`: `font-size:11px; font-weight:600; border-radius:5px; padding:2px 7px`. In CRM →
text "In CRM", `background:var(--crm-bg); color:var(--crm-text)`. Not in CRM → text "—",
`background:var(--border-row); color:var(--ink-5)`.

- [ ] **Step 7: Write the table test**

Create `src/components/Table/Table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'
import { initialState, type AppState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { computeWindow } from '../../domain/virtual'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(60, { now: NOW })

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const state = { ...initialState(), phase: 'ready' as const, sorts: [], ...over }
  const range = computeWindow({
    count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0,
  })
  render(
    <Table
      state={state}
      dispatch={dispatch}
      sorted={ROWS}
      sortedIds={ROWS.map((r) => r.id)}
      range={range}
      rowHeight={32}
    />
  )
  return { dispatch, state, range, user: userEvent.setup() }
}

describe('Table virtualization', () => {
  it('renders only the windowed rows, not the whole dataset', () => {
    const { range } = setup()
    expect(screen.getAllByRole('row').length - 1).toBe(range.end - range.start)
    expect(range.end).toBeLessThan(ROWS.length)
  })
})

describe('Table sorting', () => {
  it('sorts ascending on a plain header click', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Headcount/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'sort/toggle', key: 'headcount', append: false })
  })

  it('appends a sort on shift click', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /Headcount/ }))
    await user.keyboard('{/Shift}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'sort/toggle', key: 'headcount', append: true })
  })

  it('exposes sort direction through aria-sort', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }] })
    const header = screen.getByRole('columnheader', { name: /Revenue/ })
    expect(header).toHaveAttribute('aria-sort', 'descending')
  })

  it('marks unsorted columns as aria-sort none', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }] })
    expect(screen.getByRole('columnheader', { name: /Country/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('shows a priority number only when more than one sort is active', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }, { key: 'name', dir: 'asc' }] })
    expect(screen.getByRole('columnheader', { name: /Revenue/ })).toHaveTextContent('↓1')
  })
})

describe('Table columns', () => {
  it('hides a column that is marked hidden', () => {
    setup({ hidden: { country: true } })
    expect(screen.queryByRole('columnheader', { name: /Country/ })).toBeNull()
  })

  it('respects the configured column order', () => {
    setup({ colOrder: ['owner', 'industry', 'stage', 'headcount', 'revenue', 'country', 'founded', 'lastActivity', 'inCRM'] })
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers[2]).toMatch(/Owner/)
  })
})

describe('Table cells', () => {
  it('renders the CRM badge in both states', () => {
    setup()
    const badges = screen.getAllByText(/In CRM|—/)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('formats dates as ISO calendar dates', () => {
    setup()
    expect(screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 8: Run the test, implement until green**

Run: `npx vitest run src/components/Table`
Expected: FAIL first, then PASS.

- [ ] **Step 9: Check 50k performance by hand**

Run `npm run dev`, switch to 50k, and scroll hard with the browser performance panel recording.
Confirm the rendered row count stays at the window size and scrolling holds 60fps. If frames
drop, check that the row component is memoized and that no handler is re-created per row.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(ui): add virtualized table with multi-sort and column controls"
```

---

### Task 10: Selection, reconciliation, bulk bar, and the loading, error and empty states

**Files:**
- Modify: `src/components/Table/Table.tsx`, `TableRow.tsx`, `TableHeader.tsx`
- Create: `src/components/Table/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `states.module.css`
- Create: `src/components/ReconciliationBanner/ReconciliationBanner.tsx`, `ReconciliationBanner.module.css`
- Create: `src/components/BulkBar/BulkBar.tsx`, `BulkBar.module.css`
- Create: `src/components/Toast/Toast.tsx`, `Toast.module.css`
- Test: `src/components/Table/selection.test.tsx`, `src/components/ReconciliationBanner/ReconciliationBanner.test.tsx`

**Reference:** `design_handoff_fieldset/Fieldset.dc.html:196-343`.

**Interfaces:**
- Consumes: `isSelected`, `selectedCount`, `canSelectAllMatching`, `needsReconciliation`,
  `stillMatchingCount` from `../../domain/selection`.
- Produces:
  - `<ReconciliationBanner snapCount matchingCount onKeep onTrim onClear />`
  - `<BulkBar count showSelectAll matchingCount onSelectAll onAddToCrm onExport onClear />`
  - `<LoadingState count />`, `<ErrorState onRetry />`, `<EmptyState onClear />`, `<Toast message />`

- [ ] **Step 1: Wire row selection**

Each row's checkbox dispatches `selection/toggleRow` with the row id, its **absolute index in
`sorted`** (not the window index), `event.shiftKey`, and `sortedIds`. Give it
`aria-label={`Select ${row.name}`}`. Clicking the checkbox calls `stopPropagation` so it does
not trigger a row-level handler.

- [ ] **Step 2: Wire the header checkbox**

The header checkbox dispatches `selection/toggleWindow` with the ids of the rows currently
rendered — `sortedIds.slice(range.start, range.end)`. It is checked only when every rendered
row is selected. Label it `aria-label="Select the rows on screen"`; the distinction from
"select all matching" is the entire point of the control and must be legible to a screen reader.

- [ ] **Step 3: Build the reconciliation banner**

Shown when `needsReconciliation(selection, filtered.length, filterKey)`. While it is shown the
bulk bar is hidden.

Strip: `background:var(--amber-bg-strip); border-bottom:1px solid var(--amber-border-strip);
color:var(--amber-text-deep); font-size:12.5px; display:flex; align-items:center; gap:10px;
padding:8px 16px; flex:none`. A mono "SELECTION" tag sits on `var(--amber-bg-tag)`.

Copy, exactly: `You selected all {snapCount} rows matching the previous filter. The filter
changed — {matchingCount} of them still match.` Both numbers pass through `formatNumber`.

Three actions: "Keep all {snapCount}" (outline, dispatches `selection/keep` with the current
`filterKey`), "Trim to {matchingCount} matching" (solid `var(--amber-text-deep)`, dispatches
`selection/trim` with the current filtered ids), "Clear selection" (ghost, dispatches
`selection/clear`). Give the strip `role="status"` so it is announced.

- [ ] **Step 4: Build the bulk bar**

Shown when `selectedCount > 0`, the phase is ready, and the banner is not shown. Floating pill:
`position:absolute; bottom:18px; left:50%; transform:translateX(-50%);
background:var(--dark-bg); color:#fff; border-radius:11px; box-shadow:var(--shadow-bulk);
display:flex; align-items:center; gap:10px; padding:8px 12px; z-index:50`.

Contents: mono "{n} selected"; "Select all {n} matching" shown only when
`canSelectAllMatching(selection, filtered.length)`, styled as an indigo-tinted ghost using
`var(--accent-on-dark)`; "Add to CRM" solid `var(--accent)`; "Export CSV" outline
`var(--dark-border)`; and a × clear button. "Add to CRM" and "Export CSV" dispatch
`toast/show` with `"{n} companies queued for CRM import"` and `"Exported {n} rows to CSV"`.

- [ ] **Step 5: Build the three non-ready states**

`LoadingState`: the header stub plus 14 shimmer skeleton rows. Row *i* contains three bars of
widths `120 + ((i * 37) % 80)`, `220 + ((i * 53) % 160)` and `90 + ((i * 29) % 60)` pixels. The
shimmer uses `background:linear-gradient(90deg,#f0f3f8 0px,#f7f9fc 200px,#f0f3f8 400px);
background-size:800px 100%; animation:shimmer 1.3s linear infinite`. Under
`prefers-reduced-motion` the global rule already stops the animation; also set a flat
`#f0f3f8` background in that media query so it does not freeze mid-gradient. Below the rows,
mono text "loading {n} companies…".

`ErrorState`: centred column with a 44px tile `background:var(--error-bg);
color:var(--error-text); border-radius:12px` containing "!", then "Couldn't load companies" at
15px/600, then mono 11.5px `var(--ink-5)` "GET /api/companies → 503", then a Retry button
`background:var(--dark-bg); color:#fff` dispatching `load/start` with the current `dataN`.

`EmptyState`: centred column with a 44px dashed tile (`border:1px dashed var(--border-dashed)`,
`color:var(--ink-5)`) containing "0", "No companies match this filter" at 15px/600, and a
"Clear filters" button dispatching `tree/clear`.

- [ ] **Step 6: Build the toast**

`position:absolute; top:14px; left:50%; transform:translateX(-50%); background:#fff;
border:1px solid var(--border-strong); border-radius:9px; box-shadow:var(--shadow-menu);
padding:9px 14px; font-size:12.5px; z-index:200`. Rendered when `state.toast` is set; the
2600ms dismissal already lives in `useFieldset`. Give it `role="status"`.

- [ ] **Step 7: Write the selection interaction test**

Create `src/components/Table/selection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'
import { initialState, type AppState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { computeWindow } from '../../domain/virtual'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(60, { now: NOW })
const IDS = ROWS.map((r) => r.id)

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
  render(
    <Table
      state={{ ...initialState(), phase: 'ready', sorts: [], ...over }}
      dispatch={dispatch}
      sorted={ROWS}
      sortedIds={IDS}
      range={win}
      rowHeight={32}
    />
  )
  return { dispatch, win, user: userEvent.setup() }
}

describe('row selection', () => {
  it('toggles a row with its absolute index in the sorted set', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByLabelText(`Select ${ROWS[2].name}`))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'selection/toggleRow', id: ROWS[2].id, index: 2, shiftKey: false, sortedIds: IDS,
    })
  })

  it('reports a shift click so the reducer can extend the range', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Shift>}')
    await user.click(screen.getByLabelText(`Select ${ROWS[4].name}`))
    await user.keyboard('{/Shift}')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'selection/toggleRow', shiftKey: true, index: 4 })
    )
  })
})

describe('header checkbox', () => {
  it('names itself as the on-screen rows, not all matching rows', () => {
    setup()
    expect(screen.getByLabelText('Select the rows on screen')).toBeInTheDocument()
  })

  it('toggles only the rendered window', async () => {
    const { dispatch, win, user } = setup()
    await user.click(screen.getByLabelText('Select the rows on screen'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'selection/toggleWindow', windowIds: IDS.slice(win.start, win.end),
    })
  })

  it('is checked only when every rendered row is selected', () => {
    const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
    setup({ selection: { mode: 'ids', ids: new Set(IDS.slice(win.start, win.end)), snapCount: 0, anchor: null, dismissKey: null } })
    expect(screen.getByLabelText('Select the rows on screen')).toBeChecked()
  })
})
```

- [ ] **Step 8: Write the reconciliation banner test**

Create `src/components/ReconciliationBanner/ReconciliationBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReconciliationBanner } from './ReconciliationBanner'

const setup = () => {
  const onKeep = vi.fn()
  const onTrim = vi.fn()
  const onClear = vi.fn()
  render(
    <ReconciliationBanner
      snapCount={1240} matchingCount={318}
      onKeep={onKeep} onTrim={onTrim} onClear={onClear}
    />
  )
  return { onKeep, onTrim, onClear, user: userEvent.setup() }
}

describe('ReconciliationBanner', () => {
  it('states what was selected and how much still matches', () => {
    setup()
    expect(
      screen.getByText(
        'You selected all 1,240 rows matching the previous filter. The filter changed — 318 of them still match.'
      )
    ).toBeInTheDocument()
  })

  it('announces itself as a status', () => {
    setup()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('offers all three resolutions with their counts', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Keep all 1,240' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trim to 318 matching' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
  })

  it('invokes keep', async () => {
    const { onKeep, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Keep all 1,240' }))
    expect(onKeep).toHaveBeenCalled()
  })

  it('invokes trim', async () => {
    const { onTrim, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Trim to 318 matching' }))
    expect(onTrim).toHaveBeenCalled()
  })

  it('invokes clear', async () => {
    const { onClear, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onClear).toHaveBeenCalled()
  })
})
```

- [ ] **Step 9: Run the tests, implement until green**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 10: Walk the four scenarios by hand**

With `npm run dev` running, confirm each behaves as specified:

1. Select three rows, press "Select all N matching", tighten a condition → the banner appears
   and the bulk bar hides. Press Keep → banner goes. Change the filter again → banner returns.
2. Open the "EMEA legacy" view → the amber condition renders, the ignored count shows, and rows
   still come back.
3. Press the header checkbox → the bulk bar reports only the on-screen count, and offers
   "Select all N matching" as a separate action.
4. Switch to 50k → skeleton, then smooth scrolling; shift-click two headers to multi-sort.

- [ ] **Step 11: Run the accessibility and responsive checks**

- Resize from 320px to 1920px; confirm no horizontal page scroll (the table scrolls inside its
  own container).
- Tab through the app; confirm every control shows a visible focus ring.
- Enable "reduce motion" at the OS level and reload during loading; confirm the skeleton is
  static and flat, not frozen mid-gradient.
- Check contrast on `var(--ink-5)` text over `var(--surface-header)` and on the bulk bar's
  `var(--accent-on-dark)` over `var(--dark-bg)`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(ui): add selection, reconciliation banner, bulk bar and non-ready states"
```

---

### Task 11: Publish and deploy

**Files:**
- Create: `netlify.toml`
- Modify: `README.md`

**Interfaces:**
- Consumes: a green CI run.
- Produces: a public repository and a live URL.

- [ ] **Step 1: Write `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

Deliberately absent: `X-Frame-Options`. The app is meant to be embeddable in an iframe from the
portfolio site, and a blanket `DENY` would silently break that. If a CSP is added later it must
use `frame-ancestors` with the portfolio origin allowed.

- [ ] **Step 2: Create the public repository**

```bash
gh repo create filter-builder --public --source=. --remote=origin --description "Fieldset — a nested query builder and virtualized table built around the edge cases most products get wrong"
```

- [ ] **Step 3: Push and confirm CI**

```bash
git push -u origin main
gh run watch
```

Expected: the CI workflow passes typecheck, lint, test and build.

- [ ] **Step 4: Deploy to Netlify**

Link the repository to a Netlify site and deploy. Confirm the production URL loads, the app
fills the viewport, and 50k mode works on the deployed build.

- [ ] **Step 5: Verify the embed path**

Create a scratch HTML file locally containing
`<iframe src="<production-url>" style="width:100%;height:700px;border:0"></iframe>`, open it,
and confirm the app fills the frame, the table scrolls inside it, and the page does not attempt
to break out or collapse to zero height.

- [ ] **Step 6: Update the README and commit**

Add the live URL, a screenshot, and a short "Embedding" section showing the iframe snippet.

```bash
git add -A
git commit -m "chore: add Netlify config and publish"
git push
```

---

## Definition of Done

- `npm run typecheck && npm run lint && npm run test && npm run build` all pass.
- Every rule in spec section 6 and every transition in spec section 7 has a passing test.
- The four scenarios in Task 10 Step 10 behave as specified.
- The accessibility and responsive checks in Task 10 Step 11 pass.
- CI is green on `main`, the repository is public, and the deployed URL works both standalone
  and inside an iframe.
