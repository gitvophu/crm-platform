import { contactName } from '@crm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { contactQueries, contactsApi } from './contacts-api';

/** Archive and restore, with a toast and a refresh of every contacts query. */
export function useContactActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: contactQueries.all });

  const archive = useMutation({
    mutationFn: contactsApi.archive,
    meta: { errorTitle: 'Couldn’t archive the contact' },
    onSuccess: async (contact) => {
      toast.success('Contact archived', {
        description: `${contactName(contact)} is hidden from the list.`,
      });
      await refresh();
    },
  });

  const restore = useMutation({
    mutationFn: contactsApi.restore,
    meta: { errorTitle: 'Couldn’t restore the contact' },
    onSuccess: async (contact) => {
      toast.success('Contact restored', {
        description: `${contactName(contact)} is back in the list.`,
      });
      await refresh();
    },
  });

  return { archive, restore };
}
