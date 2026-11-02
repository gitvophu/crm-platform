/**
 * Where to go after signing in. Only a path inside this app: `//evil.com` or `https://…` would
 * turn the login page into an open redirect.
 */
export function safeRedirect(target: string | undefined): string {
  if (!target?.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return '/';
  if (target === '/login' || target.startsWith('/login?')) return '/';
  return target;
}
