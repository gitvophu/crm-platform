import { changePasswordInput, type ChangePasswordInput, PASSWORD_MIN_LENGTH } from '@crm/shared';
import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useState } from 'react';
import { toast } from 'sonner';

import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError, describeError } from '@/lib/api';
import { fieldErrors } from '@/lib/form';

export function ChangePasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const change = useMutation({
    mutationKey: ['account', 'change-password'],
    mutationFn: (input: ChangePasswordInput) =>
      api<null>('/auth/change-password', { method: 'POST', json: input }),
    meta: { toastError: false },
  });

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = changePasswordInput.safeParse({
      currentPassword: data.get('currentPassword'),
      newPassword: data.get('newPassword'),
    });
    const next = result.success ? {} : fieldErrors(result.error.issues);
    if (!next.newPassword && data.get('newPassword') !== data.get('confirmPassword')) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    if (!result.success || Object.keys(next).length > 0) return;

    change.mutate(result.data, {
      onSuccess: () => {
        form.reset();
        toast.success('Password changed', { description: 'Other devices have been signed out.' });
      },
      onError: (error) => {
        // 403: wrong current password (a 401 would mean the session ended, handled globally).
        if (error instanceof ApiError && error.status === 403) {
          setErrors({ currentPassword: 'Current password is incorrect.' });
          return;
        }
        if (error instanceof ApiError && error.status === 401) return;
        const { message, requestId } = describeError(error);
        toast.error('Couldn’t change the password', {
          description: requestId ? `${message} Request ID ${requestId}` : message,
        });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          You stay signed in here. Other devices will be signed out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit} className="grid gap-4">
          <FormField
            id="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            disabled={change.isPending}
            error={errors.currentPassword}
          />
          <FormField
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            disabled={change.isPending}
            error={errors.newPassword}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          />
          <FormField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            disabled={change.isPending}
            error={errors.confirmPassword}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
