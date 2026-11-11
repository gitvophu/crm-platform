import type { ContactDto, ContactTagDto, Page, Role } from '@crm/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '@/app.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

const PASSWORD = 'e2e-password-1';
const UNKNOWN_ID = '01a1c000-0000-7000-8000-999999999999';

/** Users of two teams: since slice 1.4 a team no longer limits who sees or edits a contact. */
const USERS = {
  member: { role: 'member', team: 'a' },
  outsider: { role: 'member', team: 'b' },
} as const satisfies Record<string, { role: Role; team: 'a' | 'b' }>;
type Who = keyof typeof USERS;

describe('contacts', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds = {} as Record<Who, string>;
  const cookies = {} as Record<Who, string>;
  let industryId = '';

  const as = (who: Who) => ({
    get: (path: string) => request(app.getHttpServer()).get(path).set('Cookie', cookies[who]),
    post: (path: string, body?: object) =>
      request(app.getHttpServer()).post(path).set('Cookie', cookies[who]).send(body),
    patch: (path: string, body: object) =>
      request(app.getHttpServer()).patch(path).set('Cookie', cookies[who]).send(body),
  });

  async function create(body: object, who: Who = 'member'): Promise<ContactDto> {
    const res = await as(who).post('/contacts', body).expect(201);
    return res.body as ContactDto;
  }

  const company = (name: string, extra: object = {}) => create({ type: 'company', name, ...extra });
  const person = (name: string, extra: object = {}) => create({ type: 'person', name, ...extra });

  async function list(query: string): Promise<Page<ContactDto>> {
    const res = await as('member').get(`/contacts?${query}`).expect(200);
    return res.body as Page<ContactDto>;
  }
  const names = (page: Page<ContactDto>) => page.items.map((contact) => contact.name);

  async function tag(name: string): Promise<ContactTagDto> {
    return (await as('member').post('/contacts/tags', { name }).expect(200)).body as ContactTagDto;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const teamIds = {
      a: (await prisma.team.create({ data: { name: 'Contacts E2E A' } })).id,
      b: (await prisma.team.create({ data: { name: 'Contacts E2E B' } })).id,
    };
    const passwordHash = await hash(PASSWORD);
    for (const [who, { role, team }] of Object.entries(USERS) as [Who, (typeof USERS)[Who]][]) {
      const email = `${who}@contacts-e2e.test`;
      const user = await prisma.user.create({
        data: { email, name: `E2E ${who}`, role, teamId: teamIds[team], passwordHash },
      });
      userIds[who] = user.id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
      cookies[who] = setCookie.find((line) => line.startsWith('crm_access='))!.split(';')[0]!;
    }
    industryId = (await prisma.industry.create({ data: { name: 'E2E Coffee' } })).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates a company with the defaults', async () => {
      const contact = await company(' Zed Create Co ', { email: 'Hello@ZedCreate.COM' });

      expect(contact).toMatchObject({
        type: 'company',
        name: 'Zed Create Co',
        company: null,
        email: 'hello@zedcreate.com',
        countryCode: 'VN',
        tags: [],
        salesperson: null,
        peopleCount: 0,
        archivedAt: null,
      });
    });

    it('answers 400 validation_failed with the errors of each field', async () => {
      const res = await as('member').post('/contacts', { name: '', email: 'nope' }).expect(400);

      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.body).toMatchObject({
        code: 'validation_failed',
        errors: {
          type: ['Choose company or person.'],
          name: ['Enter a name.'],
          email: ['Enter a valid email.'],
        },
      });
    });

    it('gives a person the address, tax ID, industry and salesperson of their company', async () => {
      const co = await company('Zed Sync Co', {
        street: '1 Le Loi',
        city: 'Hue',
        countryCode: 'VN',
        taxId: '0300000001',
        industryId,
        salespersonId: userIds.outsider,
      });

      const member = await person('Zed Sync Person', {
        companyId: co.id,
        jobTitle: 'Buyer',
        street: 'ignored',
        taxId: 'ignored',
      });

      expect(member).toMatchObject({
        type: 'person',
        company: { id: co.id, name: 'Zed Sync Co', archived: false },
        jobTitle: 'Buyer',
        street: '1 Le Loi',
        city: 'Hue',
        taxId: '0300000001',
        industry: { id: industryId, name: 'E2E Coffee' },
        salesperson: { id: userIds.outsider, name: 'E2E outsider' },
        peopleCount: null,
      });
      expect((await as('member').get(`/contacts/${co.id}`)).body).toMatchObject({ peopleCount: 1 });
    });

    it('refuses a company that is a person, archived, unknown, or given to a company', async () => {
      const someone = await person('Zed Not A Company');
      const closed = await company('Zed Closed Co');
      await as('member').post(`/contacts/${closed.id}/archive`).expect(200);

      for (const companyId of [someone.id, closed.id, UNKNOWN_ID]) {
        await as('member')
          .post('/contacts', { type: 'person', name: 'Zed Orphan', companyId })
          .expect(400)
          .expect(({ body }) =>
            expect(body).toMatchObject({
              code: 'contact.invalid_company',
              errors: { companyId: ['Choose an active company.'] },
            }),
          );
      }
      await as('member')
        .post('/contacts', { type: 'company', name: 'Zed Branch', companyId: closed.id })
        .expect(400)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'contact.invalid_company' }));
    });

    it('refuses an unknown salesperson, industry or tag', async () => {
      const cases = [
        [{ salespersonId: UNKNOWN_ID }, 'contact.invalid_salesperson'],
        [{ industryId: UNKNOWN_ID }, 'contact.invalid_industry'],
        [{ tagIds: [UNKNOWN_ID] }, 'contact.invalid_tag'],
      ] as const;
      for (const [fields, code] of cases) {
        await as('member')
          .post('/contacts', { type: 'company', name: 'Zed Bad Ref', ...fields })
          .expect(400)
          .expect(({ body }) => expect(body).toMatchObject({ code }));
      }
    });
  });

  describe('update', () => {
    it('passes the new address of a company on to its people', async () => {
      const co = await company('Zed Moving Co', { street: 'Old street', city: 'Hanoi' });
      const member = await person('Zed Mover', { companyId: co.id });

      await as('member')
        .patch(`/contacts/${co.id}`, { street: 'New street', industryId })
        .expect(200);

      expect((await as('member').get(`/contacts/${member.id}`)).body).toMatchObject({
        street: 'New street',
        city: 'Hanoi',
        industry: { id: industryId },
      });
    });

    it('keeps the values of a person leaving their company, then lets them change', async () => {
      const co = await company('Zed Leaving Co', { city: 'Da Nang' });
      const leaver = await person('Zed Leaver', { companyId: co.id });

      const left = await as('member')
        .patch(`/contacts/${leaver.id}`, { companyId: null })
        .expect(200);
      expect(left.body).toMatchObject({ company: null, city: 'Da Nang' });

      const moved = await as('member').patch(`/contacts/${leaver.id}`, { city: 'Hue' }).expect(200);
      expect(moved.body).toMatchObject({ city: 'Hue' });
    });

    it('refuses to turn a company with people into a person', async () => {
      const co = await company('Zed Busy Co');
      await person('Zed Busy Person', { companyId: co.id });

      await as('member')
        .patch(`/contacts/${co.id}`, { type: 'person' })
        .expect(409)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'contact.company_has_people',
            errors: { type: [expect.any(String) as string] },
          }),
        );
    });

    it('drops the company and job title of a person turned into a company', async () => {
      const co = await company('Zed Parent Co');
      const member = await person('Zed Founder', { companyId: co.id, jobTitle: 'Owner' });

      const res = await as('member')
        .patch(`/contacts/${member.id}`, { type: 'company' })
        .expect(200);

      expect(res.body).toMatchObject({ type: 'company', company: null, jobTitle: null });
    });

    it('lets a user of another team edit the contact', async () => {
      const contact = await person('Zed Shared');

      const res = await as('outsider')
        .patch(`/contacts/${contact.id}`, { phone: '+84 90 000 0000' })
        .expect(200);

      expect(res.body).toMatchObject({ phone: '+84 90 000 0000' });
    });

    it('refuses to make a contact its own company', async () => {
      const co = await company('Zed Self Co');

      await as('member')
        .patch(`/contacts/${co.id}`, { type: 'person', companyId: co.id })
        .expect(400)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'contact.invalid_company' }));
    });

    it('leaves the people of a company alone when its synced values are sent unchanged', async () => {
      const co = await company('Zed Still Co', { street: 'Same street' });
      const member = await person('Zed Still Person', { companyId: co.id });

      await as('member')
        .patch(`/contacts/${co.id}`, { street: 'Same street', notes: 'Only the notes' })
        .expect(200);

      const after = (await as('member').get(`/contacts/${member.id}`)).body as ContactDto;
      expect(after.updatedAt).toBe(member.updatedAt);
    });

    it('lets a person in a company clear their salesperson', async () => {
      const co = await company('Zed Owner Co', { salespersonId: userIds.member });
      const member = await person('Zed Owned', { companyId: co.id });
      expect(member.salesperson).toMatchObject({ id: userIds.member });

      const res = await as('member')
        .patch(`/contacts/${member.id}`, { salespersonId: null })
        .expect(200);

      expect(res.body).toMatchObject({ salesperson: null });
    });

    it('accepts the current salesperson and industry even when no longer valid', async () => {
      const gone = await prisma.industry.create({ data: { name: 'E2E Gone' } });
      const co = await company('Zed Old Refs Co', { industryId: gone.id });
      await prisma.industry.update({ where: { id: gone.id }, data: { archivedAt: new Date() } });

      await as('member')
        .patch(`/contacts/${co.id}`, { industryId: gone.id, notes: 'Still fine' })
        .expect(200);
    });

    it('replaces the tags', async () => {
      const [vip, retail] = [await tag('Zed VIP'), await tag('Zed Retail')];
      const contact = await company('Zed Tagged Co', { tagIds: [vip.id, vip.id] });
      expect(contact.tags.map((t) => t.name)).toEqual(['Zed VIP']);

      const res = await as('member')
        .patch(`/contacts/${contact.id}`, { tagIds: [retail.id] })
        .expect(200);

      expect((res.body as ContactDto).tags.map((t) => t.name)).toEqual(['Zed Retail']);
    });
  });

  describe('read, archive and restore', () => {
    it('answers 404 for an unknown id and a malformed one', async () => {
      await as('member')
        .get(`/contacts/${UNKNOWN_ID}`)
        .expect(404)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'contact.not_found' }));
      await as('member').get('/contacts/not-a-uuid').expect(404);
    });

    it('needs a session, answering problem+json', async () => {
      const res = await request(app.getHttpServer()).get('/contacts').expect(401);

      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.body).toMatchObject({ code: 'unauthorized' });
    });

    it('hides an archived company from the list; its people show it as archived', async () => {
      const co = await company('Zed Archive Co');
      const member = await person('Zed Archive Person', { companyId: co.id });

      await as('member').post(`/contacts/${co.id}/archive`).expect(200);

      expect(names(await list('q=Zed Archive'))).toEqual(['Zed Archive Person']);
      expect(names(await list('q=Zed Archive&archived=true'))).toEqual(['Zed Archive Co']);
      expect((await as('member').get(`/contacts/${member.id}`)).body).toMatchObject({
        company: { id: co.id, archived: true },
      });

      const restored = await as('outsider').post(`/contacts/${co.id}/restore`).expect(200);
      expect(restored.body).toMatchObject({ archivedAt: null });
    });
  });

  describe('list', () => {
    beforeAll(async () => {
      const vip = await tag('Zed List VIP');
      const co = await company('Zedlist Co', { tagIds: [vip.id], salespersonId: userIds.member });
      await person('Zedlist Alice', { companyId: co.id, email: 'alice@zedlist.test' });
      await person('Zedlist Bob', { phone: '+84 99 123 0000' });
      const gone = await person('Zedlist Carol', { email: 'alice@zedlist.test' });
      await as('member').post(`/contacts/${gone.id}/archive`).expect(200);
    });

    it('filters by type and company, and counts the people of a company', async () => {
      const companies = await list('q=Zedlist&type=company');
      expect(names(companies)).toEqual(['Zedlist Co']);
      expect(companies.items[0]!.peopleCount).toBe(1);

      expect(names(await list('q=Zedlist&type=person&sort=name'))).toEqual([
        'Zedlist Alice',
        'Zedlist Bob',
      ]);
      expect(names(await list(`companyId=${companies.items[0]!.id}`))).toEqual(['Zedlist Alice']);
    });

    it('searches every word in name, email and phone', async () => {
      expect(names(await list('q=zedlist bob'))).toEqual(['Zedlist Bob']);
      expect(names(await list('q=123 0000'))).toEqual(['Zedlist Bob']);
    });

    it('filters by tag, salesperson and exact email, archived ones included on demand', async () => {
      const [vip] = (await as('member').get('/contacts/tags?q=Zed List').expect(200))
        .body as ContactTagDto[];

      expect(names(await list(`tag=${vip!.id}`))).toEqual(['Zedlist Co']);
      // Alice took the salesperson of her company.
      expect(names(await list('q=Zedlist&salesperson=me&sort=name'))).toEqual([
        'Zedlist Alice',
        'Zedlist Co',
      ]);
      expect(names(await list('email=ALICE@zedlist.test'))).toEqual(['Zedlist Alice']);
      expect(names(await list('email=alice@zedlist.test&archived=all&sort=name'))).toEqual([
        'Zedlist Alice',
        'Zedlist Carol',
      ]);
    });

    it('paginates with a stable order and the total', async () => {
      const first = await list('q=Zedlist&sort=name&pageSize=2');
      const second = await list('q=Zedlist&sort=name&pageSize=2&page=2');

      expect(first).toMatchObject({ page: 1, pageSize: 2, total: 3 });
      expect([...names(first), ...names(second)]).toEqual([
        'Zedlist Alice',
        'Zedlist Bob',
        'Zedlist Co',
      ]);
    });

    it('rejects an unknown sort column', async () => {
      await as('member')
        .get('/contacts?sort=stage')
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'validation_failed',
            errors: { sort: [expect.any(String) as string] },
          }),
        );
    });
  });

  describe('tags and industries', () => {
    it('returns the existing tag for the same name, whatever the case', async () => {
      const first = await tag('Zed Same');
      const again = await tag('zed same');

      expect(again).toEqual(first);
    });

    it('lists the active industries', async () => {
      const res = await as('member').get('/contacts/industries').expect(200);

      expect(res.body).toEqual(
        expect.arrayContaining([{ id: industryId, name: 'E2E Coffee' }]) as unknown[],
      );
    });
  });

  describe('GET /users', () => {
    it('lists the users of every team', async () => {
      const users = (await as('member').get('/users').expect(200)).body as { id: string }[];

      expect(users.map((user) => user.id)).toEqual(
        expect.arrayContaining([userIds.member, userIds.outsider]) as string[],
      );
    });
  });
});
