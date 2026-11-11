import { describe, expect, it } from 'vitest';

import {
  contactListQuery,
  createContactInput,
  createContactTagInput,
  updateContactInput,
} from './contacts.schema.js';

describe('createContactInput', () => {
  it('trims, lowercases the email, turns empty text into null and fills the defaults', () => {
    expect(
      createContactInput.parse({
        type: 'person',
        name: ' Hana Vo ',
        jobTitle: '',
        email: ' Hana@GreenLeaf.VN ',
        phone: '  ',
      }),
    ).toEqual({
      type: 'person',
      name: 'Hana Vo',
      jobTitle: null,
      email: 'hana@greenleaf.vn',
      phone: null,
      countryCode: 'VN',
      tagIds: [],
    });
  });

  it('reports a missing type and name, a bad email and an unknown country', () => {
    const result = createContactInput.safeParse({ name: ' ', email: 'hana@', countryCode: 'XX' });

    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ['type', 'Choose company or person.'],
      ['name', 'Enter a name.'],
      ['email', 'Enter a valid email.'],
      ['countryCode', 'Choose a country.'],
    ]);
  });
});

describe('updateContactInput', () => {
  it('keeps unsent fields out and null for cleared ones', () => {
    expect(updateContactInput.parse({ email: '', companyId: null })).toEqual({
      email: null,
      companyId: null,
    });
  });
});

describe('contactListQuery', () => {
  it('defaults page, size and sort', () => {
    expect(contactListQuery.parse({})).toEqual({ page: 1, pageSize: 25, sort: '-updatedAt' });
  });

  it('reads query-string values', () => {
    expect(
      contactListQuery.parse({
        page: '2',
        pageSize: '50',
        type: 'company',
        archived: 'true',
        salesperson: 'me',
        email: ' Hana@GreenLeaf.VN',
        sort: 'name',
      }),
    ).toMatchObject({
      page: 2,
      pageSize: 50,
      type: 'company',
      archived: true,
      salesperson: 'me',
      email: 'hana@greenleaf.vn',
      sort: 'name',
    });
    expect(contactListQuery.parse({ archived: 'all' }).archived).toBe('all');
  });

  it('rejects an unknown sort column, type and a page size over 100', () => {
    expect(contactListQuery.safeParse({ sort: 'stage' }).success).toBe(false);
    expect(contactListQuery.safeParse({ type: 'robot' }).success).toBe(false);
    expect(contactListQuery.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});

describe('createContactTagInput', () => {
  it('trims the name and refuses an empty one', () => {
    expect(createContactTagInput.parse({ name: ' VIP ' })).toEqual({ name: 'VIP' });
    expect(createContactTagInput.safeParse({ name: ' ' }).success).toBe(false);
  });
});
