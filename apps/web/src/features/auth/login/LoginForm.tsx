import { AUTH_PROBLEMS, loginInput } from '@crm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CircleAlert, Info } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';

import { FormField } from '@/components/FormField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError, describeError } from '@/lib/api';
import { fieldErrors } from '@/lib/form';
import { authApi, meQueryOptions } from '@/features/auth/auth-api';

interface LoginFormProps {
  /** App path to open after signing in (already checked by `safeRedirect`). */
  redirectTo: string;
  /** The previous session ended (expired or revoked): say why the user is here. */
  expired: boolean;
}

export function LoginForm({ redirectTo, expired }: LoginFormProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const login = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: authApi.login,
    meta: { toastError: false },
    onSuccess: async (user) => {
      queryClient.setQueryData(meQueryOptions.queryKey, user);
      await navigate({ href: redirectTo, replace: true });
    },
  });

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = loginInput.safeParse({
      email: data.get('email'),
      password: data.get('password'),
    });
    if (!result.success) {
      setErrors(fieldErrors(result.error.issues));
      return;
    }
    setErrors({});
    login.mutate(result.data);
  }

  const failure =
    login.error instanceof ApiError && login.error.code === AUTH_PROBLEMS.invalidCredentials
      ? 'Invalid email or password.'
      : login.error && describeError(login.error).message;
  const busy = login.isPending || login.isSuccess;

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      {failure ? (
        <Alert variant="destructive" className="border-destructive/25 bg-destructive-soft">
          <CircleAlert />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : (
        expired && (
          <Alert className="border-primary/25 bg-primary-soft">
            <Info />
            <AlertDescription>
              Your session has expired. Sign in again to continue.
            </AlertDescription>
          </Alert>
        )
      )}
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        autoFocus
        disabled={busy}
        error={errors.email}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        disabled={busy}
        error={errors.password}
      />
      <Button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
