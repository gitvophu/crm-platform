import type { UpdateContactInput } from '@crm/shared';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { ContactForm, contactQueries, contactsApi } from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/$id/edit')({
  staticData: { title: 'Edit' },
  component: EditContactPage,
});

function EditContactPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contact } = useSuspenseQuery(contactQueries.detail(id));
  const update = useMutation({
    mutationFn: (input: UpdateContactInput) => contactsApi.update(id, input),
    meta: { toastError: false },
  });
  const toDetail = () => void navigate({ to: '/contacts/$id', params: { id } });
  const peopleCount = contact.peopleCount ?? 0;

  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader
        title={`Edit ${contact.name}`}
        description={
          peopleCount > 0
            ? `Changes to the address, tax ID and industry are copied to its ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}.`
            : 'Visible to everyone at Nova.'
        }
      />
      <ContactForm
        contact={contact}
        onSubmit={(values) => update.mutateAsync(values)}
        onSaved={(saved) => {
          // The breadcrumb reads the cached contact: update it before going back.
          queryClient.setQueryData(contactQueries.detail(id).queryKey, saved);
          void queryClient.invalidateQueries({ queryKey: contactQueries.all });
          toast.success('Contact saved', { description: `${saved.name} was updated.` });
          toDetail();
        }}
        onCancel={toDetail}
      />
    </div>
  );
}
