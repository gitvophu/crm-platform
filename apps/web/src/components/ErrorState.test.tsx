import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, NetworkError } from '@/lib/api';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows what failed, the reason and the request id', () => {
    render(<ErrorState what="contacts" error={new ApiError(500, null, 'req-500')} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load contacts');
    expect(screen.getByText(/server answered with an error \(500\)/)).toBeInTheDocument();
    expect(screen.getByText('Request ID req-500')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry from the Try again button', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new NetworkError()} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });
});
