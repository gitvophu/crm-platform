import type { HealthResponse } from '@crm/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';
import { server } from '@/test/setup';

const HEALTH_URL = '/api/health';

/** The status card rows and the sidebar footer line. */
async function readStatus() {
  const card = (await screen.findByText('Last checked', { exact: false })).closest(
    '[data-slot=card]',
  ) as HTMLElement;
  const row = (name: string) => within(card).getByText(name).closest('li');
  return {
    api: row('API'),
    db: row('Database'),
    footer: screen.getByRole('status'),
  };
}

describe('system status', () => {
  it('shows API and DB online', async () => {
    await renderApp('/');

    const status = await readStatus();

    expect(status.api).toHaveTextContent('Online');
    expect(status.db).toHaveTextContent('Online');
    expect(status.footer).toHaveTextContent('All systems operational');
  });

  it('shows the DB unavailable when the API answers 503', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json<HealthResponse>({ status: 'ok', db: 'error' }, { status: 503 }),
      ),
    );
    await renderApp('/');

    const status = await readStatus();

    expect(status.api).toHaveTextContent('Online');
    expect(status.db).toHaveTextContent('Unavailable');
    expect(status.footer).toHaveTextContent('Database unavailable');
  });

  it('shows unreachable when a 503 does not carry a HealthResponse', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json({ statusCode: 503, message: 'Service Unavailable' }, { status: 503 }),
      ),
    );
    await renderApp('/');

    const status = await readStatus();

    expect(status.api).toHaveTextContent('Unreachable');
    expect(status.db).toHaveTextContent('Unknown');
    expect(status.footer).toHaveTextContent('Can’t reach the API');
  });

  it('shows unreachable when the request fails', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.error()));
    await renderApp('/');

    const status = await readStatus();

    expect(status.api).toHaveTextContent('Unreachable');
    expect(status.footer).toHaveTextContent('Can’t reach the API');
  });
});
