/**
 * Normalize and format blood group strings consistently across the UI.
 * Dataset stores groups as e.g. "A positive" / "A negative" / "AB positive".
 * UI legacy code uses "A+" / "A-" / "AB+". This helper renders the canonical
 * "<letter> positive/negative" form everywhere regardless of input format.
 */

export const ALL_BLOOD_GROUPS = [
  'A positive',
  'A negative',
  'B positive',
  'B negative',
  'AB positive',
  'AB negative',
  'O positive',
  'O negative',
] as const

export type BloodGroup = (typeof ALL_BLOOD_GROUPS)[number]

const SYMBOL_TO_WORD: Record<string, string> = {
  '+': 'positive',
  '-': 'negative',
  pos: 'positive',
  neg: 'negative',
  positive: 'positive',
  negative: 'negative',
}

export function formatBloodGroup(input: string | undefined | null): string {
  if (!input) return ''
  const raw = String(input).trim()
  if (!raw) return ''

  // already formatted like "A positive"
  const lowered = raw.toLowerCase()
  if (lowered.includes('positive') || lowered.includes('negative')) {
    const letter = raw.replace(/positive|negative/gi, '').trim().toUpperCase()
    const sign = lowered.includes('positive') ? 'positive' : 'negative'
    return `${letter} ${sign}`
  }

  // forms like "A+", "AB-", "O +", "O pos"
  const match = raw.match(/^\s*(A|B|AB|O)\s*([+\-]|pos|neg)\s*$/i)
  if (match) {
    const letter = match[1].toUpperCase()
    const signKey = match[2].toLowerCase()
    const sign = SYMBOL_TO_WORD[signKey] || signKey
    return `${letter} ${sign}`
  }

  return raw
}

/** Inverse: convert "A positive" back to "A+" for storage/matching. */
export function toSymbol(input: string | undefined | null): string {
  if (!input) return ''
  const raw = String(input).trim()
  if (!raw) return ''
  const lowered = raw.toLowerCase()
  if (lowered.includes('positive')) {
    return raw.replace(/positive/gi, '').trim().toUpperCase() + '+'
  }
  if (lowered.includes('negative')) {
    return raw.replace(/negative/gi, '').trim().toUpperCase() + '-'
  }
  return raw.toUpperCase()
}

/** Compare two blood groups for equality regardless of symbol vs word form. */
export function sameBloodGroup(a: string | undefined | null, b: string | undefined | null): boolean {
  return formatBloodGroup(a) === formatBloodGroup(b) && !!formatBloodGroup(a)
}
