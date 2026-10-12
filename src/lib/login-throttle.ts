import "server-only";

/**
 * Fixed-window rate limit for the admin password form.
 *
 * The payroll admin password is a single shared secret that unlocks read/write
 * over employee rates, deductions and finalised pay runs, and the login
 * endpoint had no throttle at all — so it could be guessed at full speed.
 *
 * State is in-process, so on serverless each instance keeps its own counters
 * and a determined attacker spread across many cold starts gets more attempts
 * than the numbers below suggest. It still turns "unlimited guesses" into
 * "slow and noisy", which is the point. A shared store (Redis/Upstash) would
 * make this exact, and is the upgrade if this app ever faces the open internet.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_GLOBAL = 60;

type Window = { count: number; resetAt: number };

const perIp = new Map<string, Window>();
let global: Window = { count: 0, resetAt: Date.now() + WINDOW_MS };

function bump(w: Window | undefined, now: number): Window {
  if (!w || now >= w.resetAt) return { count: 1, resetAt: now + WINDOW_MS };
  return { count: w.count + 1, resetAt: w.resetAt };
}

/** Best-effort client address. Trusts the proxy headers Vercel sets. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

export interface ThrottleResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Count one login attempt and say whether it may proceed. */
export function recordLoginAttempt(key: string): ThrottleResult {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound.
  if (perIp.size > 5000) {
    for (const [k, w] of perIp) if (now >= w.resetAt) perIp.delete(k);
  }

  global = bump(global, now);
  const next = bump(perIp.get(key), now);
  perIp.set(key, next);

  const overIp = next.count > MAX_ATTEMPTS_PER_IP;
  const overGlobal = global.count > MAX_ATTEMPTS_GLOBAL;
  if (overIp || overGlobal) {
    const resetAt = overIp ? next.resetAt : global.resetAt;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clear an address's counter after a successful sign-in. */
export function clearLoginAttempts(key: string): void {
  perIp.delete(key);
}
