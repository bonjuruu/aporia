export function formatDate(iso: string, includeYear = false): string {
  try {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (includeYear) options.year = 'numeric'
    return new Date(iso).toLocaleDateString('en-US', options)
  } catch {
    return iso
  }
}
