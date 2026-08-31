/// <reference types="node" />
// Node types are referenced only here, not added to tsconfig's `types`, so app code
// stays free of Node globals. This test reads the stylesheets from disk because
// vitest stubs CSS imports (including `?raw`) to an empty string.
import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokensCss = readFileSync('src/styles/tokens.css', 'utf8')

/**
 * Guards the colour pairings the app actually renders.
 *
 * The design handoff's own palette shipped several pairings below WCAG AA. The fix
 * changed which token each place uses rather than changing any token value, so the
 * palette stays exactly as the handoff defines it. This test fails if a future edit
 * points text at a token too light for the surface behind it.
 */

function token(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`))
  if (!match) throw new Error(`token --${name} not found in tokens.css`)
  return match[1]
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground)
  const b = luminance(background)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/** WCAG 2.1: 4.5:1 for normal text, 3:1 for large text and non-text UI. */
const AA_TEXT = 4.5

interface Pairing {
  what: string
  fg: string
  bg: string
  min?: number
}

const PAIRINGS: Pairing[] = [
  // The pairings that previously failed. Each is now on a darker token.
  { what: 'status bar meta', fg: token('ink-4'), bg: token('surface-header') },
  { what: 'CRM "—" badge', fg: token('ink-3'), bg: token('border-row') },
  { what: 'condition hit counts and × buttons', fg: token('ink-4'), bg: '#fdfdfe' },
  { what: 'group meta and × buttons', fg: token('ink-4'), bg: token('surface-group') },
  { what: 'Where / demo label / columns menu', fg: token('ink-4'), bg: token('surface-panel') },
  { what: 'deleted-field warning glyph', fg: token('amber-text'), bg: token('surface-panel') },

  // Pairings that already passed. Guarded so a future edit cannot regress them.
  { what: 'bulk bar count label', fg: '#ffffff', bg: token('dark-bg') },
  { what: 'bulk bar quiet button', fg: token('accent-on-dark'), bg: token('dark-bg') },
  { what: 'bulk bar primary button', fg: '#ffffff', bg: token('accent') },
  { what: 'bulk bar secondary button', fg: '#ffffff', bg: token('dark-bg') },
  // Non-text UI: an outline that identifies a control needs 3:1, not 4.5:1.
  { what: 'bulk bar secondary outline', fg: token('ink-5'), bg: token('dark-bg'), min: 3 },
  { what: 'primary body text', fg: token('ink-1'), bg: token('surface-panel') },
  { what: 'table mono cells', fg: token('ink-2'), bg: token('surface-panel') },
  { what: 'table mono cells on zebra rows', fg: token('ink-2'), bg: token('surface-zebra') },
  { what: 'table header labels', fg: token('ink-3'), bg: token('surface-header') },
  { what: 'active view chip', fg: token('accent'), bg: token('accent-tint-1') },
  { what: 'save-as-view button', fg: token('accent'), bg: token('accent-tint-2') },
  { what: '"In CRM" badge', fg: token('crm-text'), bg: token('crm-bg') },
  { what: 'error state text', fg: token('error-text'), bg: token('error-bg') },
  { what: 'deleted-field condition text', fg: token('amber-text'), bg: token('amber-bg') },
  { what: 'reconciliation banner text', fg: token('amber-text-deep'), bg: token('amber-bg-strip') },
  { what: 'reconciliation banner tag', fg: token('amber-text-deep'), bg: token('amber-bg-tag') },
]

describe('WCAG AA contrast of rendered colour pairings', () => {
  for (const { what, fg, bg, min = AA_TEXT } of PAIRINGS) {
    it(`${what} meets ${min}:1`, () => {
      const ratio = contrastRatio(fg, bg)
      expect(
        ratio,
        `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`
      ).toBeGreaterThanOrEqual(min)
    })
  }
})

/**
 * The pairings above assert the palette. This asserts the USAGE: the three tokens that
 * fail AA on light surfaces must not reappear in a component stylesheet. Without this,
 * pointing a label back at --ink-6 would regress silently and every test would still pass.
 */
describe('low-contrast tokens are not used on light surfaces', () => {
  const FAILS_ON_LIGHT = ['ink-5', 'ink-6', 'amber-mark']

  /** --ink-5 is only permitted on the near-black bulk bar, where it is the outline
   *  of the secondary button at 4.90:1. Asserted in PAIRINGS above. */
  const ALLOWED = new Set(['BulkBar/BulkBar.module.css:--ink-5'])

  const files = globSync('src/components/**/*.module.css')

  it('finds the component stylesheets to scan', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  for (const file of files) {
    const css = readFileSync(file, 'utf8')
    const short = file.replace('src/components/', '')
    for (const name of FAILS_ON_LIGHT) {
      const used = new RegExp(`var\\(--${name}\\)`).test(css)
      const allowed = ALLOWED.has(`${short}:--${name}`)
      if (!used && !allowed) continue
      it(`${short} uses --${name}${allowed ? ' (allowed: on a dark surface)' : ''}`, () => {
        if (allowed) {
          expect(used, `${short} no longer uses --${name}; remove it from ALLOWED`).toBe(true)
        } else {
          expect(
            used,
            `${short} uses --${name}, which fails WCAG AA on every light surface in this app. ` +
              `Use --ink-4 (or --ink-3 on --border-row) instead.`
          ).toBe(false)
        }
      })
    }
  }
})

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('returns 1:1 for a colour against itself', () => {
    expect(contrastRatio('#8b96ad', '#8b96ad')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#667089', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#667089'), 10)
  })

  it('catches the pairing this fix removed', () => {
    // --ink-6 on the group surface was 2.02:1 — the worst offender, on × buttons.
    expect(contrastRatio('#aab3c5', '#f9fafd')).toBeLessThan(AA_TEXT)
  })
})
