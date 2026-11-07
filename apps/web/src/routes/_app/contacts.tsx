import { createFileRoute, Outlet } from '@tanstack/react-router';

/** `/contacts/*`: names the first breadcrumb; each page below is its own route. */
export const Route = createFileRoute('/_app/contacts')({
  staticData: { title: 'Contacts' },
  component: Outlet,
});
