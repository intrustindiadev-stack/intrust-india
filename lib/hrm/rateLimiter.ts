/**
 * In-memory sliding window rate limiter for API routes.
 */

interface RateLimitStore {
  [key: string]: number[];
}

const memoryStore: RateLimitStore = {};

/**
 * Checks if an IP or User identifier exceeds maximum allowed requests in a window.
 * @param identifier Unique client ID (e.g. IP address or Auth User ID)
 * @param limit Max requests allowed in the time window (default: 30)
 * @param windowMs Time window in milliseconds (default: 60000ms / 1 min)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!memoryStore[identifier]) {
    memoryStore[identifier] = [];
  }

  // Filter out timestamps outside current window
  memoryStore[identifier] = memoryStore[identifier].filter((timestamp) => timestamp > windowStart);

  if (memoryStore[identifier].length >= limit) {
    const oldestTimestamp = memoryStore[identifier][0];
    const resetMs = oldestTimestamp + windowMs - now;
    return {
      success: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  memoryStore[identifier].push(now);
  return {
    success: true,
    remaining: limit - memoryStore[identifier].length,
    resetMs: windowMs,
  };
}
