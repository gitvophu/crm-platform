import { createFileRoute, redirect } from '@tanstack/react-router';

import { LoginForm, meQueryOptions, safeRedirect } from '@/features/auth';

export interface LoginSearch {
  /** App path to return to after signing in. */
  redirect?: string;
  /** Set when the session ended while the app was open. */
  expired?: boolean;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    expired: search.expired === true ? true : undefined,
  }),
  // Already signed in (user in the cache): nothing to do here.
  beforeLoad: ({ context, search }) => {
    if (!search.expired && context.queryClient.getQueryData(meQueryOptions.queryKey)) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();

  return (
    <main className="grid min-h-svh place-items-center bg-sidebar px-4 py-8">
      <div className="grid w-full max-w-sm gap-5">
        <div className="flex items-center justify-center gap-2.5">
          <div
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground"
          >
            N
          </div>
          <span className="text-base font-semibold">Nova CRM</span>
        </div>
        <div className="grid gap-4 rounded-xl border bg-card p-6 shadow-xs">
          <div>
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="mt-1 text-muted-foreground">Use your Nova Agency work email.</p>
          </div>
          <LoginForm redirectTo={safeRedirect(search.redirect)} expired={search.expired ?? false} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          No account? Ask an admin of your team.
        </p>
      </div>
    </main>
  );
}
