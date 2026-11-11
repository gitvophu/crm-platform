import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useCanGoBack, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/PageHeader';
import { ContactForm, contactQueries, contactsApi } from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/new')({
  staticData: { title: 'New contact' },
  // "Add person" on a company page: the new person starts in that company (slice 1.4, Q8).
  validateSearch: z.object({ companyId: z.uuid().optional().catch(undefined) }),
  component: NewContactPage,
});

function NewContactPage() {
  const { companyId } = Route.useSearch();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const queryClient = useQueryClient();
  const company = useQuery({ ...contactQueries.detail(companyId ?? ''), enabled: !!companyId });
  // The form shows its own errors; the mutation keeps the global 401 handling.
  const create = useMutation({ mutationFn: contactsApi.create, meta: { toastError: false } });

  // Wait for the company, so the form starts with it (an unknown one starts empty).
  if (companyId && company.isPending) return null;
  const initialCompany = company.data?.type === 'company' ? company.data : undefined;

  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader title="New contact" description="Visible to everyone at Nova." />
      <ContactForm
        initialCompany={initialCompany}
        onSubmit={(values) => create.mutateAsync(values)}
        onSaved={(contact) => {
          queryClient.setQueryData(contactQueries.detail(contact.id).queryKey, contact);
          void queryClient.invalidateQueries({ queryKey: contactQueries.all });
          toast.success('Contact saved', { description: `${contact.name} was added.` });
          void router.navigate({ to: '/contacts/$id', params: { id: contact.id } });
        }}
        // Back to where the user came from (list with filters, company page); the list otherwise.
        onCancel={() =>
          canGoBack ? router.history.back() : void router.navigate({ to: '/contacts' })
        }
      />
    </div>
  );
}
