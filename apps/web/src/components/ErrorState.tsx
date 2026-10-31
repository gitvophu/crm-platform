import { CircleAlert, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api';

interface ErrorStateProps {
  /** What failed to load, e.g. "contacts": the title reads "Couldn’t load contacts". */
  what?: string;
  error: unknown;
  onRetry?: () => void;
}

/** A load error shown in place of the content (slice 1.1, Q6). Action errors use a toast. */
export function ErrorState({ what = 'this page', error, onRetry }: ErrorStateProps) {
  const { message, requestId } = describeError(error);

  return (
    <div
      role="alert"
      className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-destructive/25 bg-destructive-soft p-4"
    >
      <CircleAlert className="row-span-3 mt-0.5 size-[18px] text-destructive" aria-hidden />
      <p className="font-semibold">Couldn’t load {what}</p>
      <p>{message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw />
            Try again
          </Button>
        )}
        {requestId && (
          <span className="min-w-0 font-mono text-xs [overflow-wrap:anywhere] text-muted-foreground">
            Request ID {requestId}
          </span>
        )}
      </div>
    </div>
  );
}
