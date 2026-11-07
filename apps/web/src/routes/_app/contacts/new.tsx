import { contactName } from '@crm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useCanGoBack, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useCurrentUser } from '@/features/auth';
import { PageHeader } from '@/components/PageHeader';
import { ContactForm, contactQueries, contactsApi } from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/new')({
  staticData: { title: 'New contact' },
  component: NewContactPage,
});

function NewContactPage() {
  const me = useCurrentUser();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const queryClient = useQueryClient();
  // The form shows its own errors; the mutation keeps the global 401 handling.
  const create = useMutation({ mutationFn: contactsApi.create, meta: { toastError: false } });

  if (!me) return null;
  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader
        title="New contact"
        description={
          me.role === 'member'
            ? 'The contact belongs to your team; you are the owner.'
            : 'The contact belongs to your team.'
        }
      />
      <ContactForm
        me={me}
        onSubmit={(values) => create.mutateAsync(values)}
        onSaved={(contact) => {
          queryClient.setQueryData(contactQueries.detail(contact.id).queryKey, contact);
          void queryClient.invalidateQueries({ queryKey: contactQueries.all });
          toast.success('Contact saved', { description: `${contactName(contact)} was added.` });
          void router.navigate({ to: '/contacts/$id', params: { id: contact.id } });
        }}
        // Back to the list as it was (filters in its URL); straight to the list otherwise.
        onCancel={() =>
          canGoBack ? router.history.back() : void router.navigate({ to: '/contacts' })
        }
      />
    </div>
  );
}
