export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}
