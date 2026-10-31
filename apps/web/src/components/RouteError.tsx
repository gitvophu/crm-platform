import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';

import { ErrorState } from '@/components/ErrorState';

/** Default error page of every route. Try again re-runs the loaders, not only the render. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <ErrorState error={error} onRetry={() => void router.invalidate()} />;
}
