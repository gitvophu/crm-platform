import type { HealthResponse } from '@crm/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/setup';
import { HEALTH_URL } from './fetch-health';
import { HealthStatus } from './HealthStatus';

function renderHealthStatus() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HealthStatus />
    </QueryClientProvider>,
  );
}

describe('HealthStatus', () => {
  it('shows ok when API and DB are healthy', async () => {
    server.use(
      http.get(HEALTH_URL, () => HttpResponse.json<HealthResponse>({ status: 'ok', db: 'ok' })),
    );

    renderHealthStatus();

    expect(await screen.findByText('API: ok, DB: ok')).toBeInTheDocument();
  });

  it('shows the DB error when the API answers 503', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json<HealthResponse>({ status: 'ok', db: 'error' }, { status: 503 }),
      ),
    );

    renderHealthStatus();

    expect(await screen.findByText('API: ok, DB: error')).toBeInTheDocument();
  });

  it('shows unreachable when a 503 does not carry a HealthResponse', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json({ statusCode: 503, message: 'Service Unavailable' }, { status: 503 }),
      ),
    );

    renderHealthStatus();

    expect(await screen.findByText('API: không kết nối được')).toBeInTheDocument();
  });

  it('shows unreachable when the request fails', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.error()));

    renderHealthStatus();

    expect(await screen.findByText('API: không kết nối được')).toBeInTheDocument();
  });
});
