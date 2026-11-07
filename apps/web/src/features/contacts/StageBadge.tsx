import type { ContactStage } from '@crm/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STAGE_LABEL } from './stage';

const DOT: Record<ContactStage, string> = {
  lead: 'bg-info',
  prospect: 'bg-warning',
  customer: 'bg-success',
  churned: 'bg-muted-foreground',
};

export function StageBadge({ stage }: { stage: ContactStage }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[stage])} />
      {STAGE_LABEL[stage]}
    </Badge>
  );
}
