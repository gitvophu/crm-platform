import { createFileRoute } from '@tanstack/react-router';

import { NOT_FOUND_TITLE } from '@/components/AppHeader';
import { NotFound } from '@/components/NotFound';

// Catch-all: an unknown URL is a 404 inside the layout, and only for signed-in users.
export const Route = createFileRoute('/_app/$')({
  staticData: { title: NOT_FOUND_TITLE },
  component: NotFound,
});
