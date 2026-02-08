// M1: Content length limits for input fields

export const LIMITS = {
  name: 50,
  bio: 500,
  skill: 100,
  description: 500,
  url: 500,
  content: 500,
  creator: 100,
  endpoint: 500,
} as const

/** Validate a string field against its max length. Returns error message or null. */
export function validateLength(field: string, value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  if (value.length > max) return `${field} exceeds maximum length of ${max} characters`
  return null
}

/** Validate multiple fields. Returns first error or null. */
export function validateFields(fields: Array<[string, unknown, number]>): string | null {
  for (const [name, value, max] of fields) {
    const err = validateLength(name, value, max)
    if (err) return err
  }
  return null
}
