const REFRESH_URL = '/api/auth/refresh';
const LOCK_NAME = 'crm-auth-refresh';

let inFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<boolean> {
  // Plain fetch, not api(): api() would answer this endpoint's 401 by refreshing again.
  try {
    const res = await fetch(REFRESH_URL, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Asks the API for a new access token with the refresh cookie (ADR-0004). Returns whether it
 * worked. Requests that hit a 401 at the same time share one call, and tabs take turns through
 * the Web Locks API: a tab that waited sends the cookie the previous one just received, instead
 * of the token that was rotated away.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= (
    typeof navigator !== 'undefined' && 'locks' in navigator
      ? navigator.locks.request(LOCK_NAME, postRefresh)
      : postRefresh()
  ).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
