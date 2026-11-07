import { describe, expect, it } from 'vitest';

import { contactListQuery, createContactInput, updateContactInput } from './contacts.schema.js';

describe('createContactInput', () => {
  it('trims, lowercases the email, turns empty text into null and defaults the stage', () => {
    expect(
      createContactInput.parse({
        firstName: ' Hana ',
        lastName: '',
        email: ' Hana@GreenLeaf.VN ',
        phone: '  ',
      }),
    ).toEqual({
      firstName: 'Hana',
      lastName: null,
      email: 'hana@greenleaf.vn',
      phone: null,
      stage: 'lead',
    });
  });

  it('reports a missing first name and a bad email', () => {
    const result = createContactInput.safeParse({ firstName: ' ', email: 'hana@' });

    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ['firstName', 'Enter a first name.'],
      ['email', 'Enter a valid email.'],
    ]);
  });
});

describe('updateContactInput', () => {
  it('keeps unsent fields out and null for cleared ones', () => {
    expect(updateContactInput.parse({ email: '', stage: 'customer' })).toEqual({
      email: null,
      stage: 'customer',
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
        stage: 'lead,customer',
        archived: 'true',
        owner: 'me',
        sort: 'name',
      }),
    ).toMatchObject({
      page: 2,
      pageSize: 50,
      stage: ['lead', 'customer'],
      archived: true,
      owner: 'me',
      sort: 'name',
    });
  });

  it('rejects an unknown sort column and a page size over 100', () => {
    expect(contactListQuery.safeParse({ sort: 'password' }).success).toBe(false);
    expect(contactListQuery.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});
