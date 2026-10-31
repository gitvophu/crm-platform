import { QueryClientProvider, useMutation } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Toaster } from '@/components/ui/sonner';
import { ApiError, NetworkError } from './api';
import { createQueryClient, shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it('does not retry a 4xx', () => {
    expect(shouldRetry(0, new ApiError(404, null, null))).toBe(false);
  });

  it('retries a 5xx or a network error once', () => {
    for (const error of [new ApiError(503, null, null), new NetworkError()]) {
      expect(shouldRetry(0, error)).toBe(true);
      expect(shouldRetry(1, error)).toBe(false);
    }
  });
});

function SaveButton() {
  const mutation = useMutation({
    mutationFn: () => Promise.reject(new ApiError(409, null, 'req-409')),
    meta: { errorTitle: 'Couldn’t save the contact' },
  });
  return <button onClick={() => mutation.mutate()}>Save</button>;
}

describe('createQueryClient', () => {
  it('shows a failed mutation as a toast with the request id', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SaveButton />
        <Toaster />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Couldn’t save the contact')).toBeInTheDocument();
    expect(
      screen.getByText('The request was rejected (409). Request ID req-409'),
    ).toBeInTheDocument();
  });
});
