import type { ContactDto, ContactTagDto, IndustryDto, Page, UserSummary } from '@crm/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';
import { server, testUser } from '@/test/setup';

const COLLEAGUE: UserSummary = {
  id: '019a3c1e-0000-7000-8000-000000000002',
  name: 'Duc Pham',
  email: 'member@nova.test',
  role: 'member',
  team: { id: '019a3c1e-0000-7000-8000-0000000000bb', name: 'Brand' },
};
const ME: UserSummary = { ...testUser };
const FNB: IndustryDto = { id: '019a3c1e-0000-7000-8000-0000000000f1', name: 'F&B' };
const VIP: ContactTagDto = { id: '019a3c1e-0000-7000-8000-0000000000e1', name: 'VIP', color: 0 };

let sequence = 0;
function contact(fields: Partial<ContactDto> & Pick<ContactDto, 'name'>): ContactDto {
  sequence += 1;
  const type = fields.type ?? 'person';
  return {
    id: `019a3c1e-0000-7000-8000-${String(sequence).padStart(12, '0')}`,
    type,
    company: null,
    email: null,
    phone: null,
    website: null,
    jobTitle: null,
    street: null,
    city: null,
    countryCode: 'VN',
    taxId: null,
    industry: null,
    tags: [],
    salesperson: null,
    notes: null,
    peopleCount: type === 'company' ? 0 : null,
    archivedAt: null,
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
    ...fields,
  };
}

const greenleaf = () =>
  contact({
    type: 'company',
    name: 'Greenleaf Coffee',
    street: '12 Nguyen Hue, District 1',
    city: 'Ho Chi Minh City',
    taxId: '0312345678',
    industry: FNB,
    salesperson: { id: ME.id, name: ME.name },
    tags: [VIP],
    peopleCount: 1,
  });

/** Hana works at `company`, whose address, tax ID and industry she shares. */
const hana = (company: ContactDto) =>
  contact({
    name: 'Hana Vo',
    company: { id: company.id, name: company.name, archived: company.archivedAt !== null },
    email: 'hana@greenleafcoffee.vn',
    jobTitle: 'Marketing Director',
    street: company.street,
    city: company.city,
    taxId: company.taxId,
    industry: company.industry,
    salesperson: company.salesperson,
  });

/** In-memory `/api/contacts` for the page under test; `requests` records each list query. */
function fakeContactsApi(initial: ContactDto[]) {
  const contacts = [...initial];
  const tags = [VIP];
  const requests: URLSearchParams[] = [];
  const bodies: Record<string, unknown>[] = [];
  const find = (id: unknown) => contacts.find((item) => item.id === id);
  const notFound = () =>
    HttpResponse.json({ code: 'contact.not_found', status: 404 }, { status: 404 });

  server.use(
    http.get('/api/users', () => HttpResponse.json<UserSummary[]>([COLLEAGUE, ME])),
    http.get('/api/contacts/industries', () => HttpResponse.json<IndustryDto[]>([FNB])),
    http.get('/api/contacts/tags', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
      return HttpResponse.json(tags.filter((tag) => tag.name.toLowerCase().includes(q)));
    }),
    http.post('/api/contacts/tags', async ({ request }) => {
      const { name } = (await request.json()) as { name: string };
      const tag: ContactTagDto = {
        id: `019a3c1e-0000-7000-8000-0000000000e${tags.length + 1}`,
        name,
        color: tags.length,
      };
      tags.push(tag);
      return HttpResponse.json(tag);
    }),
    http.get('/api/contacts', ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const archived = params.get('archived');
      const q = params.get('q')?.toLowerCase();
      const items = contacts.filter(
        (item) =>
          (archived === 'all' || Boolean(item.archivedAt) === (archived === 'true')) &&
          (!params.get('type') || item.type === params.get('type')) &&
          (!params.get('companyId') || item.company?.id === params.get('companyId')) &&
          (!params.get('email') || item.email === params.get('email')) &&
          (!q || item.name.toLowerCase().includes(q)),
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
      const body = (await request.json()) as Record<string, unknown> & Pick<ContactDto, 'name'>;
      bodies.push(body);
      const parent = find(body.companyId);
      const created = contact({
        ...body,
        company: parent ? { id: parent.id, name: parent.name, archived: false } : null,
      });
      contacts.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch('/api/contacts/:id', async ({ params, request }) => {
      const found = find(params.id);
      if (!found) return notFound();
      const body = (await request.json()) as Partial<ContactDto>;
      bodies.push(body);
      Object.assign(found, body);
      return HttpResponse.json(found);
    }),
    http.post('/api/contacts/:id/:action', ({ params }) => {
      const found = find(params.id);
      if (!found) return notFound();
      found.archivedAt = params.action === 'archive' ? '2026-11-05T09:00:00Z' : null;
      return HttpResponse.json(found);
    }),
  );
  return { contacts, requests, bodies };
}

describe('contacts list', () => {
  it('shows companies and people, filters by type and keeps it in the URL', async () => {
    const company = greenleaf();
    const api = fakeContactsApi([company, hana(company)]);
    const { router, user } = await renderApp('/contacts');

    // The company's own row: its name link is the first one (Hana's row links it too).
    const companyRow = (
      await screen.findAllByRole('link', { name: 'Greenleaf Coffee' })
    )[0]!.closest('tr')!;
    expect(within(companyRow).getByText('1 person')).toBeVisible();
    expect(within(companyRow).getByText('VIP')).toBeVisible();
    const personRow = screen.getByRole('link', { name: 'Hana Vo' }).closest('tr')!;
    expect(within(personRow).getByRole('link', { name: 'Greenleaf Coffee' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Companies' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Hana Vo' })).toBeNull());
    expect(router.state.location.search).toEqual({ type: 'company' });
    expect(api.requests.at(-1)?.get('type')).toBe('company');

    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(router.state.location.search).toEqual({ type: 'company', sort: 'name' });
  });

  it('narrows the list to a company from the Company column, and clears it', async () => {
    const company = greenleaf();
    const api = fakeContactsApi([company, hana(company), contact({ name: 'Ngoc Anh' })]);
    const { router, user } = await renderApp('/contacts');

    const personRow = (await screen.findByRole('link', { name: 'Hana Vo' })).closest('tr')!;
    await user.click(within(personRow).getByRole('link', { name: 'Greenleaf Coffee' }));

    expect(await screen.findByText(/Company: Greenleaf Coffee/)).toBeVisible();
    expect(router.state.location.search).toEqual({ companyId: company.id });
    expect(api.requests.at(-1)?.get('companyId')).toBe(company.id);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Ngoc Anh' })).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Remove company filter' }));
    expect(await screen.findByRole('link', { name: 'Ngoc Anh' })).toBeVisible();
  });

  it('opens a contact from anywhere on its row', async () => {
    const company = greenleaf();
    fakeContactsApi([company]);
    const { router, user } = await renderApp('/contacts');

    const row = (await screen.findByRole('link', { name: 'Greenleaf Coffee' })).closest('tr')!;
    await user.click(within(row).getByText('1 person'));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${company.id}`));
  });

  it('searches after a pause in typing', async () => {
    const api = fakeContactsApi([greenleaf()]);
    const { router, user } = await renderApp('/contacts');
    await screen.findByRole('link', { name: 'Greenleaf Coffee' });

    await user.type(screen.getByLabelText('Search contacts'), 'green');

    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'green' }));
    expect(api.requests.at(-1)?.get('q')).toBe('green');
  });

  it('offers to clear filters when nothing matches, and to add a contact when there are none', async () => {
    fakeContactsApi([]);
    const { user } = await renderApp('/contacts?type=company');

    expect(await screen.findByText('No contacts match')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('No contacts yet')).toBeVisible();
  });

  it('goes back to the last page when the page asked for is past the end', async () => {
    fakeContactsApi([greenleaf()]);
    const { router } = await renderApp('/contacts?page=5');

    expect(await screen.findByRole('link', { name: 'Greenleaf Coffee' })).toBeVisible();
    expect(router.state.location.search).toEqual({});
  });

  it('lists archived contacts with Restore, and keeps them archived on Cancel', async () => {
    const archived = contact({ name: 'Vy Dang', archivedAt: '2026-09-01T00:00:00Z' });
    fakeContactsApi([greenleaf(), archived]);
    const { router, user } = await renderApp('/contacts');
    await screen.findByRole('link', { name: 'Greenleaf Coffee' });

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByRole('heading', { name: 'Archived contacts' })).toBeVisible();
    const row = (await screen.findByRole('link', { name: 'Vy Dang' })).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Restore' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(archived.archivedAt).not.toBeNull();

    await user.click(within(row).getByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Restore Vy Dang');
    // The button of the row does not also open the contact.
    expect(router.state.location.pathname).toBe('/contacts');
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));

    expect(await screen.findByText('Contact restored')).toBeVisible();
    expect(archived.archivedAt).toBeNull();
  });
});

describe('contact detail', () => {
  it('shows a company with its people, and adds a person to it', async () => {
    const company = greenleaf();
    fakeContactsApi([company, hana(company)]);
    const { router, user } = await renderApp(`/contacts/${company.id}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Greenleaf Coffee' }),
    ).toBeVisible();
    expect(screen.getByText('Company · F&B')).toBeVisible();
    const people = await screen.findByRole('table');
    expect(within(people).getByRole('link', { name: 'Hana Vo' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Add person' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts/new'));
    expect(router.state.location.search).toEqual({ companyId: company.id });
    expect(await screen.findByRole('radio', { name: /Person/ })).toBeChecked();
    expect(screen.getByText('Greenleaf Coffee')).toBeVisible();
    expect(await screen.findByLabelText('Street')).toHaveValue('12 Nguyen Hue, District 1');
    expect(screen.getByLabelText('Street')).toHaveAttribute('readonly');
  });

  it('shows where the synced values of a person come from, and an archived company', async () => {
    const company = greenleaf();
    company.archivedAt = '2026-10-01T00:00:00Z';
    const person = hana(company);
    fakeContactsApi([company, person]);
    await renderApp(`/contacts/${person.id}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana Vo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Greenleaf Coffee' })).toBeVisible();
    expect(screen.getByText('Archived')).toBeVisible();
    expect(screen.getAllByText('From Greenleaf Coffee')).toHaveLength(3);
  });

  it('archives after confirming, and restores from the banner', async () => {
    const company = greenleaf();
    fakeContactsApi([company]);
    const { router, user } = await renderApp(`/contacts/${company.id}`);

    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Its 1 person stays linked and active.');
    await user.click(within(dialog).getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Contact archived')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'));
    expect(company.archivedAt).not.toBeNull();

    await router.navigate({ to: '/contacts/$id', params: { id: company.id } });
    expect(
      await screen.findByText('This contact is archived and hidden from lists.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restore' }),
    );
    expect(await screen.findByText('Contact restored')).toBeVisible();
    expect(company.archivedAt).toBeNull();
  });

  it('says not found for an unknown contact', async () => {
    fakeContactsApi([]);
    await renderApp('/contacts/019a3c1e-0000-7000-8000-999999999999');

    expect(await screen.findByRole('heading', { name: 'Contact not found' })).toBeVisible();
  });
});

describe('contact form', () => {
  it('creates a company with an industry, a new tag and a salesperson', async () => {
    const api = fakeContactsApi([]);
    const { router, user } = await renderApp('/contacts/new');

    expect(await screen.findByRole('radio', { name: /Company/ })).toBeChecked();
    await user.type(screen.getByRole('textbox', { name: 'Company name' }), 'Saigon Bikes');
    await user.selectOptions(await screen.findByLabelText('Industry'), FNB.id);
    await user.selectOptions(screen.getByLabelText('Salesperson'), COLLEAGUE.id);
    await user.type(screen.getByRole('combobox', { name: 'Tags' }), 'Retail');
    await user.click(await screen.findByRole('option', { name: 'Create “Retail”' }));
    expect(await screen.findByRole('button', { name: 'Remove Retail' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Saigon Bikes' })).toBeVisible();
    expect(router.state.location.pathname).toBe(`/contacts/${api.contacts[0]!.id}`);
    expect(api.bodies[0]).toMatchObject({
      type: 'company',
      name: 'Saigon Bikes',
      companyId: null,
      industryId: FNB.id,
      salespersonId: COLLEAGUE.id,
      countryCode: 'VN',
      tagIds: [expect.any(String) as string],
    });
  });

  it('creates a person in a company picked by searching', async () => {
    const company = greenleaf();
    const api = fakeContactsApi([company]);
    const { user } = await renderApp('/contacts/new');

    await user.click(await screen.findByRole('radio', { name: /Person/ }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Lan Pham');
    await user.type(screen.getByRole('combobox', { name: 'Company' }), 'green');
    await user.click(await screen.findByRole('option', { name: /Greenleaf Coffee/ }));
    expect(await screen.findByLabelText('City')).toHaveValue('Ho Chi Minh City');
    expect(screen.getByText(/uses the company’s salesperson \(Linh Tran\)/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Lan Pham' })).toBeVisible();
    expect(api.bodies[0]).toMatchObject({ type: 'person', companyId: company.id });
  });

  it('checks the fields before sending', async () => {
    fakeContactsApi([]);
    const { user } = await renderApp('/contacts/new');

    await user.type(await screen.findByLabelText('Email'), 'hana@');
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByText('Enter a name.')).toBeVisible();
    expect(screen.getByText('Enter a valid email.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Company name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('warns about an email already in use, and still saves', async () => {
    const company = greenleaf();
    const api = fakeContactsApi([company, hana(company)]);
    const { user } = await renderApp('/contacts/new');

    await user.click(await screen.findByRole('radio', { name: /Person/ }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Hana V.');
    await user.type(screen.getByLabelText('Email'), 'Hana@GreenleafCoffee.vn');
    await user.tab();

    const warning = await screen.findByText(/Already used by/);
    expect(warning).toHaveTextContent(
      'Already used by Hana Vo (Greenleaf Coffee). You can still save.',
    );
    expect(within(warning).getByRole('link', { name: 'Hana Vo' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana V.' })).toBeVisible();
    expect(api.contacts).toHaveLength(3);
  });

  it('shows a field error from the API under the field', async () => {
    fakeContactsApi([]);
    const message = 'Choose an active company.';
    server.use(
      http.post('/api/contacts', () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'contact.invalid_company',
            detail: message,
            errors: { companyId: [message] },
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { user } = await renderApp('/contacts/new');

    await user.click(await screen.findByRole('radio', { name: /Person/ }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Minh');
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByText('Couldn’t save the contact. Check the fields below.')).toBeVisible();
  });

  it('does not let a company with people become a person', async () => {
    const company = greenleaf();
    fakeContactsApi([company, hana(company)]);
    await renderApp(`/contacts/${company.id}/edit`);

    expect(await screen.findByRole('radio', { name: /Person/ })).toBeDisabled();
    expect(
      screen.getByText(
        'Greenleaf Coffee has 1 person. Move them to another company before changing it to a person.',
      ),
    ).toBeVisible();
  });

  it('saves changes and goes back to the detail page', async () => {
    const company = greenleaf();
    const api = fakeContactsApi([company]);
    const { router, user } = await renderApp(`/contacts/${company.id}/edit`);

    const street = await screen.findByLabelText('Street');
    await user.clear(street);
    await user.type(street, '1 Le Loi');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Contact saved')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${company.id}`));
    expect(api.bodies[0]).toMatchObject({ street: '1 Le Loi', tagIds: [VIP.id] });
  });

  it('asks before leaving a form with unsaved changes', async () => {
    const company = greenleaf();
    fakeContactsApi([company]);
    const { router, user } = await renderApp(`/contacts/${company.id}/edit`);

    await user.type(await screen.findByLabelText('Phone'), '+84');
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Contacts' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Discard changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(router.state.location.pathname).toBe(`/contacts/${company.id}/edit`);
    expect(screen.getByLabelText('Phone')).toHaveValue('+84');

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Contacts' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'));
  });

  it('leaves an untouched form without asking', async () => {
    const company = greenleaf();
    fakeContactsApi([company]);
    const { router, user } = await renderApp(`/contacts/${company.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/contacts/${company.id}`));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
