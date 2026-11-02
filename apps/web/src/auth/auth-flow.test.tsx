import type { AuthUser, LoginInput } from '@crm/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';
import { server, testUser } from '@/test/setup';

const unauthorized = () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

/** No session: `/auth/me` and `/auth/refresh` answer 401. */
function signedOut() {
  server.use(http.get('/api/auth/me', unauthorized), http.post('/api/auth/refresh', unauthorized));
}

async function fillLogin(
  user: Awaited<ReturnType<typeof renderApp>>['user'],
  email: string,
  password: string,
) {
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('sign in', () => {
  it('sends a signed-out user to login, then back to the page they opened', async () => {
    signedOut();
    let sent: LoginInput | undefined;
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        sent = (await request.json()) as LoginInput;
        return HttpResponse.json<AuthUser>(testUser);
      }),
    );
    const { router, user } = await renderApp('/deals');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(router.state.location.search).toEqual({ redirect: '/deals' });

    await fillLogin(user, ' Manager@Nova.test ', 'nova-dev-password');

    expect(await screen.findByRole('heading', { name: 'Deals is coming soon' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/deals');
    expect(sent).toEqual({ email: 'manager@nova.test', password: 'nova-dev-password' });
  });

  it('says the credentials are wrong without saying which one', async () => {
    signedOut();
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 }),
      ),
    );
    const { router, user } = await renderApp('/login');

    await fillLogin(user, 'manager@nova.test', 'wrong-password');

    expect(await screen.findByText('Invalid email or password.')).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('checks empty fields before sending anything', async () => {
    signedOut();
    const { user } = await renderApp('/login');

    await fillLogin(user, '', '');

    expect(screen.getByText('Enter your email.')).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('user menu', () => {
  it('shows who is signed in and signs out', async () => {
    let loggedOut = false;
    server.use(
      http.post('/api/auth/logout', () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router, user } = await renderApp('/');

    await user.click(screen.getByRole('button', { name: /Linh Tran/ }));
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('manager@nova.test');
    expect(menu).toHaveTextContent('Growth');
    expect(menu).toHaveTextContent('Manager');

    signedOut();
    await user.click(within(menu).getByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(loggedOut).toBe(true);
    expect(router.state.location.pathname).toBe('/login');
  });

  it('opens the account page', async () => {
    const { user } = await renderApp('/');

    await user.click(screen.getByRole('button', { name: /Linh Tran/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Account' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    expect(screen.getByText('manager@nova.test')).toBeVisible();
  });
});

describe('change password', () => {
  const fill = async (
    user: Awaited<ReturnType<typeof renderApp>>['user'],
    current: string,
    next: string,
    confirm = next,
  ) => {
    await user.type(screen.getByLabelText('Current password'), current);
    await user.type(screen.getByLabelText('New password'), next);
    await user.type(screen.getByLabelText('Confirm new password'), confirm);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
  };

  it('changes the password and says other devices were signed out', async () => {
    server.use(
      http.post('/api/auth/change-password', () => new HttpResponse(null, { status: 204 })),
    );
    const { user } = await renderApp('/account');

    await fill(user, 'old-password', 'new-password-1');

    expect(await screen.findByText('Password changed')).toBeVisible();
    expect(screen.getByText('Other devices have been signed out.')).toBeVisible();
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('shows a wrong current password under its field', async () => {
    server.use(
      http.post('/api/auth/change-password', () =>
        HttpResponse.json({ message: 'Current password is incorrect' }, { status: 403 }),
      ),
    );
    const { user } = await renderApp('/account');

    await fill(user, 'wrong-password', 'new-password-1');

    expect(await screen.findByText('Current password is incorrect.')).toBeVisible();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('checks the confirmation before sending', async () => {
    const { user } = await renderApp('/account');

    await fill(user, 'old-password', 'new-password-1', 'new-password-2');

    expect(screen.getByText('Passwords do not match.')).toBeVisible();
  });

  it('sends the user to login when the session has ended', async () => {
    server.use(
      http.post('/api/auth/change-password', unauthorized),
      http.post('/api/auth/refresh', unauthorized),
    );
    const { router, user } = await renderApp('/account');

    await fill(user, 'old-password', 'new-password-1');

    expect(
      await screen.findByText('Your session has expired. Sign in again to continue.'),
    ).toBeVisible();
    expect(router.state.location.search).toEqual({ redirect: '/account', expired: true });
  });
});
