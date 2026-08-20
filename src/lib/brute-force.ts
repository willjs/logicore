const FAILURES = new Map<string, { attempts: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function isLocked(email: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const entry = FAILURES.get(email);
  if (!entry) return false;
  if (Date.now() > entry.lockedUntil) {
    FAILURES.delete(email);
    return false;
  }
  return true;
}

export function recordFailure(email: string): void {
  const entry = FAILURES.get(email);
  const attempts = (entry?.attempts ?? 0) + 1;
  FAILURES.set(email, {
    attempts,
    lockedUntil: attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
  });
}

export function clearFailures(email: string): void {
  FAILURES.delete(email);
}
