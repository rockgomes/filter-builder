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
