import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError, describeError } from '@/lib/api';

declare module '@tanstack/react-query' {
  interface Register {
    /**
     * `errorTitle` sets the title of the error toast. `toastError: false` turns the toast off for
     * a mutation that shows its errors itself, e.g. next to a form field.
     */
    mutationMeta: { errorTitle?: string; toastError?: boolean };
  }
}

/** A 4xx will fail the same way again; a network error or 5xx may be transient (slice 1.1, Q6). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

/** Queries and mutations under `['auth', ...]` handle their own 401 (bad credentials, signed out). */
const isAuthKey = (key: QueryKey | undefined) => key?.[0] === 'auth';

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

interface QueryClientOptions {
  /** Called when a call still gets 401 after `api()` tried to refresh: the session is over. */
  onSessionExpired?: () => void;
}

/**
 * Errors while loading data are shown in place (ErrorState); errors of an action (save, delete,
 * drag) are shown as a toast, here, so each mutation does not have to. A 401 ends the session.
 */
export function createQueryClient({ onSessionExpired }: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthorized(error) && !isAuthKey(query.queryKey)) onSessionExpired?.();
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (isUnauthorized(error) && !isAuthKey(mutation.options.mutationKey)) {
          onSessionExpired?.();
          return;
        }
        if (mutation.meta?.toastError === false) return;
        const { message, requestId } = describeError(error);
        toast.error(mutation.meta?.errorTitle ?? 'Something went wrong', {
          description: requestId ? `${message} Request ID ${requestId}` : message,
        });
      },
    }),
  });
}
