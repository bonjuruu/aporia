import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formats a valid ISO string as month and day', () => {
    const result = formatDate('2024-01-01T00:00:00Z')

    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/\d{1,2}/)
  })

  it('includes year when includeYear is true', () => {
    const result = formatDate('2024-01-01T00:00:00Z', true)

    expect(result).toMatch(/2024/)
    expect(result).toMatch(/Jan/)
  })

  it('returns "Invalid Date" for unparseable date string', () => {
    // Note: new Date('not-a-date').toLocaleDateString() returns "Invalid Date"
    // rather than throwing, so the catch branch is not exercised here.
    const result = formatDate('not-a-date')

    expect(result).toBe('Invalid Date')
  })
})
