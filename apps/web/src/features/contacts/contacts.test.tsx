import type { AuthUser, ContactDto, Page, UserSummary } from '@crm/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';
import { server, testUser } from '@/test/setup';

const TEAM = testUser.team;
const COLLEAGUE: UserSummary = {
  id: '019a3c1e-0000-7000-8000-000000000002',
  name: 'Duc Pham',
  email: 'member@nova.test',
  role: 'member',
  team: TEAM,
};
const ME: UserSummary = { ...testUser, team: TEAM };

let sequence = 0;
function contact(fields: Partial<ContactDto> & { firstName: string }): ContactDto {
  sequence += 1;
  return {
    id: `019a3c1e-0000-7000-8000-${String(sequence).padStart(12, '0')}`,
    lastName: null,
    email: null,
    phone: null,
    jobTitle: null,
    stage: 'lead',
    notes: null,
    owner: { id: ME.id, name: ME.name },
    team: TEAM,
    archivedAt: null,
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
    permissions: { canEdit: true },
    ...fields,
  };
}

/** In-memory `/api/contacts` for the page under test; `requests` records each list query. */
function fakeContactsApi(initial: ContactDto[]) {
  const contacts = [...initial];
  const requests: URLSearchParams[] = [];
  const find = (id: unknown) => contacts.find((item) => item.id === id);
  const notFound = () =>
    HttpResponse.json({ code: 'contact.not_found', status: 404 }, { status: 404 });

  server.use(
    http.get('/api/users', () => HttpResponse.json<UserSummary[]>([COLLEAGUE, ME])),
    http.get('/api/contacts', ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const items = contacts.filter(
        (item) =>
          Boolean(item.archivedAt) === (params.get('archived') === 'true') &&
          (!params.get('stage') || item.stage === params.get('stage')),
      );
      const page = Number(params.get('page') ?? 1);
      return HttpResponse.json<Page<ContactDto>>({
        items: items.slice((page - 1) * 25, page * 25),
        page,
        pageSize: 25,
        total: items.length,
      });
    }),
    http.get('/api/contacts/:id', ({ params }) => {
      const found = find(params.id);
      return found ? HttpResponse.json(found) : notFound();
    }),
    http.post('/api/contacts', async ({ request }) => {
      const created = contact((await request.json()) as ContactDto);
      contacts.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch('/api/contacts/:id', async ({ params, request }) => {
      const found = find(params.id);
      if (!found) return notFound();
      Object.assign(found, (await request.json()) as Partial<ContactDto>);
      return HttpResponse.json(found);
    }),
    http.post('/api/contacts/:id/:action', ({ params }) => {
      const found = find(params.id);
      if (!found) return notFound();
      found.archivedAt = params.action === 'archive' ? '2026-11-05T09:00:00Z' : null;
      return HttpResponse.json(found);
    }),
  );
  return { contacts, requests };
}

const hana = () =>
  contact({
    firstName: 'Hana',
    lastName: 'Vo',
    email: 'hana@greenleafcoffee.vn',
    jobTitle: 'Marketing Director',
    stage: 'customer',
  });

describe('contacts list', () => {
  it('shows the team’s contacts and keeps filters and sort in the URL', async () => {
    const api = fakeContactsApi([hana(), contact({ firstName: 'Minh', stage: 'prospect' })]);
    const { router, user } = await renderApp('/contacts');

    expect(await screen.findByRole('link', { name: 'Hana Vo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Minh' })).toBeVisible();
    expect(screen.getByText('1–2 of 2 contacts')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Stage'), 'customer');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Minh' })).toBeNull());
    expect(router.state.location.search).toEqual({ stage: 'customer' });
    expect(api.requests.at(-1)?.get('stage')).toBe('customer');

    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(router.state.location.search).toEqual({ stage: 'customer', sort: 'name' });
    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(router.state.location.search).toMatchObject({ sort: '-name' });
  });

  it('opens a contact from anywhere on its row', async () => {
    const contactHana = hana();
    fakeContactsApi([contactHana]);
    const { router, user } = await renderApp('/contacts');

    const row = (await screen.findByRole('link', { name: 'Hana Vo' })).closest('tr')!;
    await user.click(within(row).getByText('Customer'));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${contactHana.id}`));
  });

  it('searches after a pause in typing', async () => {
    const api = fakeContactsApi([hana()]);
    const { router, user } = await renderApp('/contacts');
    await screen.findByRole('link', { name: 'Hana Vo' });

    await user.type(screen.getByLabelText('Search contacts'), 'hana');

    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'hana' }));
    expect(api.requests.at(-1)?.get('q')).toBe('hana');
  });

  it('offers to clear filters when nothing matches, and to add a contact when there are none', async () => {
    fakeContactsApi([]);
    const { user } = await renderApp('/contacts?stage=churned');

    expect(await screen.findByText('No contacts match')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('No contacts yet')).toBeVisible();
  });

  it('goes back to the last page when the page asked for is past the end', async () => {
    fakeContactsApi([hana()]);
    const { router } = await renderApp('/contacts?page=5');

    expect(await screen.findByRole('link', { name: 'Hana Vo' })).toBeVisible();
    expect(router.state.location.search).toEqual({});
  });

  it('lists archived contacts with Restore', async () => {
    const archived = contact({ firstName: 'Vy', archivedAt: '2026-09-01T00:00:00Z' });
    fakeContactsApi([hana(), archived]);
    const { router, user } = await renderApp('/contacts');
    await screen.findByRole('link', { name: 'Hana Vo' });

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByRole('heading', { name: 'Archived contacts' })).toBeVisible();
    const row = (await screen.findByRole('link', { name: 'Vy' })).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Restore Vy');
    // The button of the row does not also open the contact.
    expect(router.state.location.pathname).toBe('/contacts');
    expect(archived.archivedAt).not.toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));

    expect(await screen.findByText('Contact restored')).toBeVisible();
    expect(archived.archivedAt).toBeNull();
  });

  it('keeps the contact archived when Restore is cancelled', async () => {
    const archived = contact({ firstName: 'Vy', archivedAt: '2026-09-01T00:00:00Z' });
    fakeContactsApi([archived]);
    const { user } = await renderApp('/contacts?archived=true');

    const row = (await screen.findByRole('link', { name: 'Vy' })).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Restore' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(archived.archivedAt).not.toBeNull();
  });
});

describe('contact detail', () => {
  it('shows the contact and archives it after confirming', async () => {
    const contactHana = hana();
    fakeContactsApi([contactHana]);
    const { router, user } = await renderApp(`/contacts/${contactHana.id}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana Vo' })).toBeVisible();
    expect(within(screen.getByRole('banner')).getByText('Hana Vo')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Archive Hana Vo?');
    await user.click(within(dialog).getByRole('button', { name: 'Archive' }));

    expect(await screen.findByText('Contact archived')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'));
    expect(contactHana.archivedAt).not.toBeNull();
  });

  it('restores an archived contact from its banner after confirming', async () => {
    const archived = contact({ firstName: 'Vy', archivedAt: '2026-09-01T00:00:00Z' });
    fakeContactsApi([archived]);
    const { user } = await renderApp(`/contacts/${archived.id}`);

    expect(
      await screen.findByText('This contact is archived and hidden from the list.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Restore Vy');
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));

    expect(await screen.findByText('Contact restored')).toBeVisible();
    expect(archived.archivedAt).toBeNull();
  });

  it('says not found for an unknown contact', async () => {
    fakeContactsApi([]);
    await renderApp('/contacts/019a3c1e-0000-7000-8000-999999999999');

    expect(await screen.findByRole('heading', { name: 'Contact not found' })).toBeVisible();
  });
});

describe('contact form', () => {
  it('creates a contact and opens it', async () => {
    const api = fakeContactsApi([]);
    const { router, user } = await renderApp('/contacts/new');

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Thao');
    await user.type(screen.getByLabelText('Last name'), 'Le');
    await user.selectOptions(screen.getByLabelText('Owner'), COLLEAGUE.id);
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Thao Le' })).toBeVisible();
    expect(screen.getByText('Contact saved')).toBeVisible();
    expect(router.state.location.pathname).toBe(`/contacts/${api.contacts[0]!.id}`);
    expect(api.contacts[0]).toMatchObject({ firstName: 'Thao', ownerId: COLLEAGUE.id });
  });

  it('checks the fields before sending', async () => {
    fakeContactsApi([]);
    const { user } = await renderApp('/contacts/new');

    await user.type(await screen.findByLabelText('Email'), 'hana@');
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByText('Enter a first name.')).toBeVisible();
    expect(screen.getByText('Enter a valid email.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'First name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('shows a taken email from the API under the field', async () => {
    fakeContactsApi([]);
    const message = 'Another contact of your team already uses this email.';
    server.use(
      http.post('/api/contacts', () =>
        HttpResponse.json(
          {
            status: 409,
            code: 'contact.email_taken',
            detail: message,
            errors: { email: [message] },
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { user } = await renderApp('/contacts/new');

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Minh');
    await user.type(screen.getByLabelText('Email'), 'minh@saigonbikes.com');
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByText('Couldn’t save the contact. Check the fields below.')).toBeVisible();
  });

  it('saves changes and goes back to the detail page', async () => {
    const contactHana = hana();
    fakeContactsApi([contactHana]);
    const { router, user } = await renderApp(`/contacts/${contactHana.id}/edit`);

    const jobTitle = await screen.findByLabelText('Job title');
    await user.clear(jobTitle);
    await user.type(jobTitle, 'CMO');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Contact saved')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${contactHana.id}`));
    expect(contactHana.jobTitle).toBe('CMO');
  });

  it('asks before leaving a form with unsaved changes', async () => {
    const contactHana = hana();
    fakeContactsApi([contactHana]);
    const { router, user } = await renderApp(`/contacts/${contactHana.id}/edit`);

    await user.type(await screen.findByLabelText('Phone'), '+84');
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Contacts' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Discard changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(router.state.location.pathname).toBe(`/contacts/${contactHana.id}/edit`);
    expect(screen.getByLabelText('Phone')).toHaveValue('+84');

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Contacts' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'));
  });

  it('leaves an untouched form without asking', async () => {
    const contactHana = hana();
    fakeContactsApi([contactHana]);
    const { router, user } = await renderApp(`/contacts/${contactHana.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${contactHana.id}`));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('as a member', () => {
  const member: AuthUser = { ...COLLEAGUE };

  beforeEach(() => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(member)));
  });

  it('cannot edit a colleague’s contact: no buttons, and the edit URL explains why', async () => {
    const owned = { ...hana(), permissions: { canEdit: false } };
    fakeContactsApi([owned]);
    const { router } = await renderApp(`/contacts/${owned.id}`);

    expect(
      await screen.findByText('Only Linh Tran or a manager can edit this contact.'),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();

    await router.navigate({ to: '/contacts/$id/edit', params: { id: owned.id } });
    expect(
      await screen.findByRole('heading', { name: 'You can’t edit this contact' }),
    ).toBeVisible();
  });

  it('creates contacts as their own, without an owner picker', async () => {
    fakeContactsApi([]);
    await renderApp('/contacts/new');

    expect(
      await screen.findByText('The contact belongs to your team; you are the owner.'),
    ).toBeVisible();
    expect(screen.queryByLabelText('Owner')).toBeNull();
    expect(screen.getByText('You')).toBeVisible();
  });
});
