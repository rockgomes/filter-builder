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
