interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding rate limiter for sensitive endpoints (gate authentication & RSVP spam defense)
class InMemoryRateLimiter {
  private limits = new Map<string, RateLimitRecord>();

  /**
   * Check if a key (e.g. IP + endpoint, or userId + endpoint) has exceeded max attempts.
   * @param key Unique identifier for the rate limit subject
   * @param maxAttempts Maximum allowed attempts within windowMs
   * @param windowMs Time window in milliseconds
   * @returns { allowed: boolean, remaining: number, retryAfterSeconds: number }
   */
  public check(
    key: string,
    maxAttempts: number = 10,
    windowMs: number = 60 * 1000
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const record = this.limits.get(key);

    if (!record || now > record.resetAt) {
      // New or expired window
      this.limits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      retryAfterSeconds: 0,
    };
  }

  public reset(key: string): void {
    this.limits.delete(key);
  }

  // Periodic cleanup of stale records
  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Global singleton to survive HMR in dev
const globalForLimiter = globalThis as unknown as { rateLimiter?: InMemoryRateLimiter };
export const rateLimiter = globalForLimiter.rateLimiter || new InMemoryRateLimiter();
if (process.env.NODE_ENV !== "production") {
  globalForLimiter.rateLimiter = rateLimiter;
}
