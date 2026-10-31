import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError, describeError } from '@/lib/api';

declare module '@tanstack/react-query' {
  interface Register {
    /** `meta: { errorTitle }` on a mutation sets the title of its error toast. */
    mutationMeta: { errorTitle?: string };
  }
}

/** A 4xx will fail the same way again; a network error or 5xx may be transient (slice 1.1, Q6). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * Errors while loading data are shown in place (ErrorState); errors of an action (save, delete,
 * drag) are shown as a toast, here, so each mutation does not have to.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        const { message, requestId } = describeError(error);
        toast.error(mutation.meta?.errorTitle ?? 'Something went wrong', {
          description: requestId ? `${message} Request ID ${requestId}` : message,
        });
      },
    }),
  });
}
