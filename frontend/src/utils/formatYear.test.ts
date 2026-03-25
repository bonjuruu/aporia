import { formatYear } from './formatYear'

describe('formatYear', () => {
  it('returns null for null input', () => {
    expect(formatYear(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatYear(undefined)).toBeNull()
  })

  it('formats negative year as BCE', () => {
    expect(formatYear(-500)).toBe('500 BCE')
  })

  it('formats positive year as string', () => {
    expect(formatYear(1687)).toBe('1687')
  })

  it('formats zero as "0"', () => {
    expect(formatYear(0)).toBe('0')
  })
})
