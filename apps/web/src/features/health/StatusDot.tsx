import { cn } from '@/lib/utils';
import type { HealthLevel } from './use-health';

const dotColor: Record<HealthLevel | 'pending', string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  down: 'bg-destructive',
  pending: 'bg-muted-foreground/40',
};

export function StatusDot({ level }: { level: HealthLevel | 'pending' }) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotColor[level])} />;
}
