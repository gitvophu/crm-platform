import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { App } from '@/App';
import { createAppRouter } from '@/router';

/** Renders the whole app (layout, routes, providers) at `path`, with in-memory history. */
export async function renderApp(path = '/') {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const user = userEvent.setup();
  render(<App router={router} />);
  // The router resolves the first match asynchronously; wait for a page to render.
  await screen.findByRole('main');
  return { router, user };
}
