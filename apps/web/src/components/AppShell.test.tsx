import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';

const navLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name });

describe('app shell', () => {
  it('opens on the dashboard', async () => {
    await renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    expect(navLink('Dashboard')).toHaveAttribute('aria-current', 'page');
  });

  it('navigates from the sidebar without a page load', async () => {
    const { router, user } = await renderApp('/');

    await user.click(navLink('Deals'));

    expect(await screen.findByRole('heading', { name: 'Deals is coming soon' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/deals');
    expect(navLink('Deals')).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('banner')).getByText('Deals')).toBeVisible();
  });

  it('marks modules that are not built yet', async () => {
    await renderApp('/');

    for (const name of ['Contacts', 'Companies', 'Deals', 'Activities']) {
      const item = navLink(name).closest('li');
      expect(item).toHaveTextContent('Soon');
    }
  });

  it('shows a 404 inside the layout for an unknown URL', async () => {
    const { user } = await renderApp('/nope');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(screen.getByText('/nope')).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Go to dashboard' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });
});
