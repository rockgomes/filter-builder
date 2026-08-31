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
    { id: 'v_all', name: 'All companies', tree: emptyTree(), pinned: true, locked: true },
    { id: 'v_icp', name: 'ICP · Mid-market SaaS', tree: icpTree(), pinned: true },
    {
      id: 'v_ncrm', name: 'Not in CRM, active', pinned: true,
      tree: { kind: 'group', id: 'root', op: 'AND', children: [cond('inCRM', 'false'), cond('lastActivity', 'last90')] },
    },
    {
      id: 'v_legacy', name: 'EMEA legacy', warn: true, pinned: true,
      tree: { kind: 'group', id: 'root', op: 'AND', children: [cond('region_emea', 'is', 'EMEA'), cond('revenue', 'gt', '1')] },
    },
  ]
}
