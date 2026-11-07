import { contactName, type UpdateContactInput } from '@crm/shared';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useCurrentUser } from '@/features/auth';
import { PageHeader } from '@/components/PageHeader';
import { CannotEdit, ContactForm, contactQueries, contactsApi } from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/$id/edit')({
  staticData: { title: 'Edit' },
  component: EditContactPage,
});

function EditContactPage() {
  const { id } = Route.useParams();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contact } = useSuspenseQuery(contactQueries.detail(id));
  const update = useMutation({
    mutationFn: (input: UpdateContactInput) => contactsApi.update(id, input),
    meta: { toastError: false },
  });

  if (!me) return null;
  if (!contact.permissions.canEdit) return <CannotEdit contact={contact} />;
  const toDetail = () => void navigate({ to: '/contacts/$id', params: { id } });

  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader
        title={`Edit ${contactName(contact)}`}
        description="Changes are visible to your whole team."
      />
      <ContactForm
        contact={contact}
        me={me}
        onSubmit={(values) => update.mutateAsync(values)}
        onSaved={(saved) => {
          // The breadcrumb reads the cached contact: update it before going back.
          queryClient.setQueryData(contactQueries.detail(id).queryKey, saved);
          void queryClient.invalidateQueries({ queryKey: contactQueries.all });
          toast.success('Contact saved', { description: `${contactName(saved)} was updated.` });
          toDetail();
        }}
        onCancel={toDetail}
      />
    </div>
  );
}
