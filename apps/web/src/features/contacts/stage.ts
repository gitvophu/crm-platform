import type { ContactStage } from '@crm/shared';

export const STAGE_LABEL: Record<ContactStage, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  customer: 'Customer',
  churned: 'Churned',
};
