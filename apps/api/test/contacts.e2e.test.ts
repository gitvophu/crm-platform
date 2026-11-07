import type { ContactDto, Page, Role } from '@crm/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '@/app.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

const PASSWORD = 'e2e-password-1';

/** Users of two teams; contacts of these tests all have a first name starting with "Zed". */
const USERS = {
  admin: { role: 'admin', team: 'a' },
  manager: { role: 'manager', team: 'a' },
  member: { role: 'member', team: 'a' },
  colleague: { role: 'member', team: 'a' },
  outsider: { role: 'member', team: 'b' },
} as const satisfies Record<string, { role: Role; team: 'a' | 'b' }>;
type Who = keyof typeof USERS;

describe('contacts', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const teamIds = { a: '', b: '' };
  const userIds = {} as Record<Who, string>;
  const cookies = {} as Record<Who, string>;

  const as = (who: Who) => ({
    get: (path: string) => request(app.getHttpServer()).get(path).set('Cookie', cookies[who]),
    post: (path: string, body?: object) =>
      request(app.getHttpServer()).post(path).set('Cookie', cookies[who]).send(body),
    patch: (path: string, body: object) =>
      request(app.getHttpServer()).patch(path).set('Cookie', cookies[who]).send(body),
  });

  async function create(who: Who, body: object): Promise<ContactDto> {
    const res = await as(who).post('/contacts', body).expect(201);
    return res.body as ContactDto;
  }

  async function list(who: Who, query: string): Promise<Page<ContactDto>> {
    const res = await as(who).get(`/contacts?${query}`).expect(200);
    return res.body as Page<ContactDto>;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    teamIds.a = (await prisma.team.create({ data: { name: 'Contacts E2E A' } })).id;
    teamIds.b = (await prisma.team.create({ data: { name: 'Contacts E2E B' } })).id;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates a contact owned by the member, in their team', async () => {
      const contact = await create('member', {
        firstName: ' Zed ',
        lastName: 'Create',
        email: 'Zed.Create@Example.COM',
      });

      expect(contact).toMatchObject({
        firstName: 'Zed',
        lastName: 'Create',
        email: 'zed.create@example.com',
        phone: null,
        stage: 'lead',
        owner: { id: userIds.member, name: 'E2E member' },
        team: { id: teamIds.a, name: 'Contacts E2E A' },
        archivedAt: null,
        permissions: { canEdit: true },
      });
    });

    it('answers 400 validation_failed with the errors of each field', async () => {
      const res = await as('member')
        .post('/contacts', { firstName: '', email: 'nope' })
        .expect(400);

      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.body).toMatchObject({
        code: 'validation_failed',
        errors: { firstName: ['Enter a first name.'], email: ['Enter a valid email.'] },
      });
    });

    it('refuses an email already used in the team, whatever the case, but not in another team', async () => {
      await create('member', { firstName: 'Zed', email: 'zed.taken@example.com' });

      const res = await as('manager')
        .post('/contacts', { firstName: 'Zed', email: 'ZED.TAKEN@example.com' })
        .expect(409);
      expect(res.body).toMatchObject({
        code: 'contact.email_taken',
        errors: { email: ['Another contact of your team already uses this email.'] },
      });

      await create('outsider', { firstName: 'Zed', email: 'zed.taken@example.com' });
    });

    it('lets a manager pick an owner of the team, not of another team', async () => {
      const contact = await create('manager', { firstName: 'Zed', ownerId: userIds.colleague });
      expect(contact.owner.id).toBe(userIds.colleague);

      const res = await as('manager')
        .post('/contacts', { firstName: 'Zed', ownerId: userIds.outsider })
        .expect(400);
      expect(res.body).toMatchObject({
        code: 'contact.invalid_owner',
        errors: { ownerId: [expect.any(String) as string] },
      });
    });

    it('does not let a member pick another owner', async () => {
      await as('member')
        .post('/contacts', { firstName: 'Zed', ownerId: userIds.colleague })
        .expect(403)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'contact.forbidden' }));
    });

    it('lets only an admin create in another team', async () => {
      await as('manager').post('/contacts', { firstName: 'Zed', teamId: teamIds.b }).expect(403);

      const contact = await create('admin', {
        firstName: 'Zed',
        lastName: 'Admin',
        teamId: teamIds.b,
        ownerId: userIds.outsider,
      });
      expect(contact.team.id).toBe(teamIds.b);
    });
  });

  describe('read', () => {
    it('hides a contact of another team behind 404, like an unknown id', async () => {
      const contact = await create('member', { firstName: 'Zed', lastName: 'Hidden' });

      await as('member').get(`/contacts/${contact.id}`).expect(200);
      const res = await as('outsider').get(`/contacts/${contact.id}`).expect(404);
      expect(res.body).toMatchObject({ code: 'contact.not_found' });
      await as('member').get('/contacts/01a10000-0000-7000-8000-000000000000').expect(404);
      await as('member').get('/contacts/not-a-uuid').expect(404);
    });

    it('needs a session, answering problem+json', async () => {
      const res = await request(app.getHttpServer()).get('/contacts').expect(401);

      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.body).toMatchObject({ code: 'unauthorized' });
    });

    it('tells the caller whether they can edit', async () => {
      const mine = await create('member', { firstName: 'Zed', lastName: 'Mine' });

      const seenByColleague = (await as('colleague').get(`/contacts/${mine.id}`))
        .body as ContactDto;
      const seenByManager = (await as('manager').get(`/contacts/${mine.id}`)).body as ContactDto;

      expect(seenByColleague.permissions.canEdit).toBe(false);
      expect(seenByManager.permissions.canEdit).toBe(true);
    });
  });

  describe('update', () => {
    it('lets the owner and a manager edit, not a colleague', async () => {
      const contact = await create('member', { firstName: 'Zed', lastName: 'Edit' });

      await as('colleague')
        .patch(`/contacts/${contact.id}`, { stage: 'customer' })
        .expect(403)
        .expect(({ body }) => expect(body).toMatchObject({ code: 'contact.forbidden' }));
      await as('outsider').patch(`/contacts/${contact.id}`, { stage: 'customer' }).expect(404);

      const byOwner = await as('member')
        .patch(`/contacts/${contact.id}`, { stage: 'prospect', phone: '+84 90 000 0000' })
        .expect(200);
      expect(byOwner.body).toMatchObject({
        stage: 'prospect',
        phone: '+84 90 000 0000',
        lastName: 'Edit',
      });

      const byManager = await as('manager')
        .patch(`/contacts/${contact.id}`, { phone: null, ownerId: userIds.colleague })
        .expect(200);
      expect(byManager.body).toMatchObject({ phone: null, owner: { id: userIds.colleague } });
    });

    it('does not let a member change the owner', async () => {
      const contact = await create('member', { firstName: 'Zed', lastName: 'Owner' });

      await as('member')
        .patch(`/contacts/${contact.id}`, { ownerId: userIds.colleague })
        .expect(403);
    });
  });

  describe('archive and restore', () => {
    it('hides an archived contact from the list, shows it with archived=true, restores it', async () => {
      const contact = await create('member', { firstName: 'Zed', lastName: 'Archive' });
      const findIn = (page: Page<ContactDto>) => page.items.some((item) => item.id === contact.id);

      const archived = await as('member').post(`/contacts/${contact.id}/archive`).expect(200);
      expect((archived.body as ContactDto).archivedAt).toEqual(expect.any(String) as string);

      expect(findIn(await list('member', 'q=Zed+Archive'))).toBe(false);
      expect(findIn(await list('member', 'q=Zed+Archive&archived=true'))).toBe(true);

      await as('colleague').post(`/contacts/${contact.id}/restore`).expect(403);
      await as('member').post(`/contacts/${contact.id}/restore`).expect(200);
      expect(findIn(await list('member', 'q=Zed+Archive'))).toBe(true);
    });

    it('frees the email while archived, and refuses to restore once it is taken again', async () => {
      const first = await create('member', { firstName: 'Zed', email: 'zed.restore@example.com' });
      await as('member').post(`/contacts/${first.id}/archive`).expect(200);
      await create('member', { firstName: 'Zed', email: 'zed.restore@example.com' });

      const res = await as('member').post(`/contacts/${first.id}/restore`).expect(409);
      expect(res.body).toMatchObject({ code: 'contact.email_taken' });
    });
  });

  describe('list', () => {
    beforeAll(async () => {
      for (const [who, lastName, stage] of [
        ['member', 'Listone', 'lead'],
        ['member', 'Listtwo', 'customer'],
        ['colleague', 'Listthree', 'customer'],
        ['outsider', 'Listfour', 'customer'],
      ] as const) {
        await create(who, {
          firstName: 'Zedlist',
          lastName,
          stage,
          email: `${lastName}@list.test`,
        });
      }
    });

    const names = (page: Page<ContactDto>) => page.items.map((item) => item.lastName);

    it('shows only the team’s contacts, and every team to an admin', async () => {
      expect(names(await list('member', 'q=Zedlist&sort=name'))).toEqual([
        'Listone',
        'Listthree',
        'Listtwo',
      ]);
      expect(names(await list('outsider', 'q=Zedlist'))).toEqual(['Listfour']);
      expect((await list('admin', 'q=Zedlist')).total).toBe(4);
    });

    it('searches every word in names and email, case-insensitively', async () => {
      expect(names(await list('member', 'q=zedlist+LISTTWO'))).toEqual(['Listtwo']);
      expect(names(await list('member', 'q=listone@list'))).toEqual(['Listone']);
    });

    it('filters by owner and stage', async () => {
      expect(names(await list('member', 'q=Zedlist&owner=me&sort=name'))).toEqual([
        'Listone',
        'Listtwo',
      ]);
      expect(names(await list('member', `q=Zedlist&owner=${userIds.colleague}`))).toEqual([
        'Listthree',
      ]);
      expect(names(await list('member', 'q=Zedlist&stage=customer&sort=-name'))).toEqual([
        'Listtwo',
        'Listthree',
      ]);
    });

    it('paginates with a stable order and the total', async () => {
      const first = await list('member', 'q=Zedlist&sort=name&pageSize=2');
      const second = await list('member', 'q=Zedlist&sort=name&pageSize=2&page=2');

      expect(first).toMatchObject({ page: 1, pageSize: 2, total: 3 });
      expect([...names(first), ...names(second)]).toEqual(['Listone', 'Listthree', 'Listtwo']);
    });

    it('rejects an unknown sort column', async () => {
      await as('member')
        .get('/contacts?sort=passwordHash')
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'validation_failed',
            errors: { sort: [expect.any(String) as string] },
          }),
        );
    });
  });

  describe('GET /users', () => {
    it('lists the caller’s team; an admin may ask for another team', async () => {
      const teamA = (await as('member').get('/users').expect(200)).body as { id: string }[];
      expect(teamA.map((user) => user.id)).toEqual(
        expect.arrayContaining([userIds.member, userIds.colleague, userIds.manager]) as string[],
      );
      expect(teamA.map((user) => user.id)).not.toContain(userIds.outsider);

      const ignored = (await as('member').get(`/users?teamId=${teamIds.b}`).expect(200)).body as {
        id: string;
      }[];
      expect(ignored.map((user) => user.id)).not.toContain(userIds.outsider);

      const teamB = (await as('admin').get(`/users?teamId=${teamIds.b}`).expect(200)).body as {
        id: string;
      }[];
      expect(teamB.map((user) => user.id)).toEqual([userIds.outsider]);
    });
  });
});
