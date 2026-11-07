import {
  type AuthUser,
  CONTACT_STAGE_DEFAULT,
  CONTACT_STAGES,
  type ContactDto,
  createContactInput,
  HTTP_STATUS,
} from '@crm/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, describeError } from '@/lib/api';
import { userQueries } from '@/features/users';
import { STAGE_LABEL } from '@/features/contacts/stage';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

/** Same rules as `POST /contacts` (shared schema); the team is the caller's or the contact's. */
const formSchema = createContactInput.omit({ teamId: true });
type FormInput = z.input<typeof formSchema>;
export type ContactFormValues = z.output<typeof formSchema>;
type FieldName = keyof FormInput;

interface ContactFormProps {
  /** The contact to edit; none to create one. */
  contact?: ContactDto;
  me: AuthUser;
  /** Sends the values; resolves with the saved contact, rejects with the API error. */
  onSubmit: (values: ContactFormValues) => Promise<ContactDto>;
  onSaved: (contact: ContactDto) => void;
  onCancel: () => void;
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  /** Marks the label; every other field is optional. */
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const note = error ?? hint;
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {note && (
        <p
          id={`${id}-note`}
          className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        >
          {note}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ contact, me, onSubmit, onSaved, onCancel }: ContactFormProps) {
  const teamId = contact?.team.id ?? me.team.id;
  const canAssignOwner = me.role !== 'member';
  // An admin editing another team's contact picks among that team's members.
  const membersQuery = useQuery({
    ...userQueries.team(me.role === 'admin' && teamId !== me.team.id ? teamId : undefined),
    enabled: canAssignOwner,
  });
  const currentOwner = {
    id: contact?.owner.id ?? me.id,
    name: contact ? contact.owner.name : me.name,
  };
  // The current owner stays selectable even when no longer in the team (moved, gone), so the
  // select shows what will be submitted.
  const owners = membersQuery.data
    ? membersQuery.data.some((member) => member.id === currentOwner.id)
      ? membersQuery.data
      : [currentOwner, ...membersQuery.data]
    : [currentOwner];

  const form = useForm<FormInput, unknown, ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: contact?.firstName ?? '',
      lastName: contact?.lastName ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      jobTitle: contact?.jobTitle ?? '',
      stage: contact?.stage ?? CONTACT_STAGE_DEFAULT,
      notes: contact?.notes ?? '',
      ownerId: contact?.owner.id ?? me.id,
    },
  });
  const { errors, isDirty, isSubmitting } = form.formState;
  const unsaved = useUnsavedChanges(isDirty);

  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await onSubmit(values);
      unsaved.allowLeave();
      onSaved(saved);
    } catch (error) {
      // 401: the session ended; the query client already sends the user to login.
      if (error instanceof ApiError && error.status === HTTP_STATUS.unauthorized) return;
      const fieldErrors = error instanceof ApiError ? Object.entries(error.fieldErrors) : [];
      if (fieldErrors.length > 0) {
        for (const [field, [message]] of fieldErrors) {
          form.setError(field as FieldName, { type: 'server', message });
        }
        form.setError('root.server', { type: 'server' });
        return;
      }
      const { message, requestId } = describeError(error);
      toast.error('Couldn’t save the contact', {
        description: requestId ? `${message} Request ID ${requestId}` : message,
      });
    }
  });

  const input = (name: Exclude<FieldName, 'stage' | 'ownerId' | 'notes'>) => ({
    id: name,
    ...form.register(name),
    disabled: isSubmitting,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-note`,
  });
  const ownerName = contact ? contact.owner.name : 'You';

  return (
    <>
      <Card>
        <CardContent>
          <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4">
            {errors.root?.server && (
              <Alert variant="destructive" className="border-destructive/25 bg-destructive-soft">
                <AlertDescription>
                  Couldn’t save the contact. Check the fields below.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="First name" required error={errors.firstName?.message}>
                <Input autoComplete="off" autoFocus aria-required {...input('firstName')} />
              </Field>
              <Field id="lastName" label="Last name" error={errors.lastName?.message}>
                <Input autoComplete="off" {...input('lastName')} />
              </Field>
            </div>
            <Field
              id="email"
              label="Email"
              error={errors.email?.message}
              hint="Unique within your team."
            >
              <Input type="email" autoComplete="off" {...input('email')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Phone" error={errors.phone?.message}>
                <Input type="tel" autoComplete="off" {...input('phone')} />
              </Field>
              <Field id="jobTitle" label="Job title" error={errors.jobTitle?.message}>
                <Input autoComplete="off" {...input('jobTitle')} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="stage" label="Stage" error={errors.stage?.message}>
                <NativeSelect
                  id="stage"
                  className="w-full"
                  disabled={isSubmitting}
                  {...form.register('stage')}
                >
                  {CONTACT_STAGES.map((stage) => (
                    <NativeSelectOption key={stage} value={stage}>
                      {STAGE_LABEL[stage]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {canAssignOwner ? (
                <Field
                  id="ownerId"
                  label="Owner"
                  error={
                    errors.ownerId?.message ??
                    (membersQuery.isError ? 'Couldn’t load the team members.' : undefined)
                  }
                  hint="Anyone in the team."
                >
                  <NativeSelect
                    id="ownerId"
                    className="w-full"
                    disabled={isSubmitting || !membersQuery.data}
                    aria-invalid={errors.ownerId ? true : undefined}
                    {...form.register('ownerId')}
                  >
                    {owners.map((member) => (
                      <NativeSelectOption key={member.id} value={member.id}>
                        {member.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : (
                <div className="grid content-start gap-1.5">
                  <span className="text-sm font-medium">Owner</span>
                  <span className="py-1.5">{ownerName}</span>
                </div>
              )}
            </div>
            <Field id="notes" label="Notes" error={errors.notes?.message}>
              <Textarea
                id="notes"
                rows={4}
                disabled={isSubmitting}
                aria-invalid={errors.notes ? true : undefined}
                {...form.register('notes')}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {unsaved.dialog}
    </>
  );
}
