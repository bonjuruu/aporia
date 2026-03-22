export function formatYear(year: number | null | undefined): string | null {
  if (year == null) return null
  if (year < 0) return `${Math.abs(year)} BCE`
  return String(year)
}
