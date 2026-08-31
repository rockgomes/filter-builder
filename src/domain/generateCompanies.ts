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
