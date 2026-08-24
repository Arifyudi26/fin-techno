/**
 * In-memory rate limiter for API routes.
 * Uses a Map with TTL-based cleanup.
 * Note: In serverless environments (Vercel), each instance has its own memory,
 * so this provides per-instance protection. For distributed rate limiting,
 * use Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    const windowExpired = now - entry.firstAttempt > 15 * 60 * 1000; // 15 min
    const blockExpired = entry.blockedUntil && now > entry.blockedUntil;
    if (windowExpired && (!entry.blockedUntil || blockExpired)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max attempts before blocking */
  maxAttempts: number;
  /** Time window in ms to count attempts */
  windowMs: number;
  /** Block duration in ms after exceeding max attempts */
  blockDurationMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.blockedUntil - now,
    };
  }

  // If blocked but block has expired, reset
  if (entry?.blockedUntil && now >= entry.blockedUntil) {
    rateLimitStore.delete(key);
    return { allowed: true, remaining: options.maxAttempts };
  }

  // No entry yet — first attempt
  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: options.maxAttempts - 1 };
  }

  // Window expired — reset
  if (now - entry.firstAttempt > options.windowMs) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: options.maxAttempts - 1 };
  }

  // Within window — increment
  entry.count += 1;

  if (entry.count > options.maxAttempts) {
    // Block the key
    entry.blockedUntil = now + options.blockDurationMs;
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: options.blockDurationMs,
    };
  }

  rateLimitStore.set(key, entry);
  return { allowed: true, remaining: options.maxAttempts - entry.count };
}

/** Reset rate limit for a key (e.g., on successful login) */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// --- OTP Attempt Tracking ---

interface OtpAttemptEntry {
  attempts: number;
  lockedUntil?: number;
}

const otpAttemptStore = new Map<string, OtpAttemptEntry>();

// Cleanup OTP attempts every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpAttemptStore.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      otpAttemptStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface OtpLimitOptions {
  maxAttempts: number;
  lockoutDurationMs: number;
}

interface OtpLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntilMs?: number;
}

export function checkOtpAttempt(
  email: string,
  options: OtpLimitOptions = { maxAttempts: 5, lockoutDurationMs: 5 * 60 * 1000 }
): OtpLimitResult {
  const now = Date.now();
  const key = `otp:${email}`;
  const entry = otpAttemptStore.get(key);

  // Check if locked out
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      attemptsRemaining: 0,
      lockedUntilMs: entry.lockedUntil - now,
    };
  }

  // Lock expired — reset
  if (entry?.lockedUntil && now >= entry.lockedUntil) {
    otpAttemptStore.delete(key);
    return { allowed: true, attemptsRemaining: options.maxAttempts };
  }

  return { allowed: true, attemptsRemaining: options.maxAttempts - (entry?.attempts || 0) };
}

export function recordOtpFailure(
  email: string,
  options: OtpLimitOptions = { maxAttempts: 5, lockoutDurationMs: 5 * 60 * 1000 }
): OtpLimitResult {
  const now = Date.now();
  const key = `otp:${email}`;
  const entry = otpAttemptStore.get(key) || { attempts: 0 };

  entry.attempts += 1;

  if (entry.attempts >= options.maxAttempts) {
    entry.lockedUntil = now + options.lockoutDurationMs;
    otpAttemptStore.set(key, entry);
    return {
      allowed: false,
      attemptsRemaining: 0,
      lockedUntilMs: options.lockoutDurationMs,
    };
  }

  otpAttemptStore.set(key, entry);
  return { allowed: true, attemptsRemaining: options.maxAttempts - entry.attempts };
}

export function resetOtpAttempts(email: string): void {
  otpAttemptStore.delete(`otp:${email}`);
}
