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
