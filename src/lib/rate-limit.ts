// Simple in-memory rate limiter for Vercel serverless
// Note: In-memory state resets on cold starts. For production, use Redis/Upstash.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  return stores.get(name)!
}

/**
 * Check rate limit for a given key.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
  storeName: string,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const store = getStore(storeName)
  const now = Date.now()
  const entry = store.get(key)

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k)
    }
  }

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true }
}

/** Get client IP from request headers (Vercel/Cloudflare) */
export function getClientIp(request: Request): string {
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
