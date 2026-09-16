/** star 数紧凑格式：48213 => 48.2k */
export function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return String(value)
}
