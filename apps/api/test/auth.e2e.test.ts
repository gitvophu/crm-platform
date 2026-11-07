import type { AuthUser } from '@crm/shared';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '@/app.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

const PASSWORD = 'e2e-password-1';
const JWT_SECRET = process.env.JWT_SECRET ?? '';

interface Session {
  access: string;
  refresh: string;
}

/** `name=value` of each Set-Cookie header, plus the raw headers to check attributes. */
function readSetCookies(res: request.Response) {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const values = Object.fromEntries(
    raw.map((line) => {
      const [pair = ''] = line.split(';');
      const index = pair.indexOf('=');
      return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))];
    }),
  );
  return { raw, values };
}

describe('auth', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teamId: string;
  let userId: string;
  const http = () => request(app.getHttpServer());

  async function createUser(email: string): Promise<string> {
    const user = await prisma.user.create({
      data: { email, name: 'E2E User', role: 'member', teamId, passwordHash: await hash(PASSWORD) },
    });
    return user.id;
  }

  async function login(email = 'auth-e2e@nova.test', password = PASSWORD): Promise<Session> {
    const res = await http().post('/auth/login').send({ email, password }).expect(200);
    const { values } = readSetCookies(res);
    return { access: values.crm_access ?? '', refresh: values.crm_refresh ?? '' };
  }

  const me = (access: string) => http().get('/auth/me').set('Cookie', `crm_access=${access}`);
  const refresh = (token: string) =>
    http().post('/auth/refresh').set('Cookie', `crm_refresh=${token}`);
  const sessionIdOf = (refreshToken: string) => refreshToken.split('.')[0] ?? '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    teamId = (await prisma.team.create({ data: { name: 'Auth E2E' } })).id;
    userId = await createUser('auth-e2e@nova.test');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns the user and sets both cookies', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: ' Auth-E2E@Nova.test ', password: PASSWORD })
        .expect(200);

      expect(res.body).toEqual<AuthUser>({
        id: userId,
        email: 'auth-e2e@nova.test',
        name: 'E2E User',
        role: 'member',
        team: { id: teamId, name: 'Auth E2E' },
      });
      const { raw } = readSetCookies(res);
      expect(raw).toEqual([
        expect.stringMatching(
          /^crm_access=.+; Path=\/api; Expires=.+; HttpOnly; Secure; SameSite=Lax$/,
        ),
        expect.stringMatching(
          /^crm_refresh=.+; Path=\/api\/auth; Expires=.+; HttpOnly; Secure; SameSite=Lax$/,
        ),
      ]);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await http()
        .post('/auth/login')
        .send({ email: 'auth-e2e@nova.test', password: 'nope-nope' })
        .expect(401);
      const unknownEmail = await http()
        .post('/auth/login')
        .send({ email: 'nobody@nova.test', password: 'nope-nope' })
        .expect(401);

      // Same answer apart from the request id, so the response does not tell which emails exist.
      const withoutRequestId = (body: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'requestId'));
      expect(withoutRequestId(wrongPassword.body as Record<string, unknown>)).toEqual(
        withoutRequestId(unknownEmail.body as Record<string, unknown>),
      );
      expect(wrongPassword.body).toMatchObject({
        status: 401,
        code: 'auth.invalid_credentials',
        detail: 'Invalid email or password.',
      });
      expect(wrongPassword.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(wrongPassword.headers['set-cookie']).toBeUndefined();
    });

    it('rejects an invalid body with the errors of each field', async () => {
      const res = await http().post('/auth/login').send({ email: 'x' }).expect(400);

      expect(res.body).toMatchObject({
        code: 'validation_failed',
        errors: { email: ['Enter a valid email.'], password: [expect.any(String)] },
      });
    });
  });

  describe('guard', () => {
    it('lets a valid access token through', async () => {
      const { access } = await login();

      await me(access)
        .expect(200)
        .expect(({ body }) => expect(body).toMatchObject({ id: userId }));
    });

    it('rejects a request without a token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      const forged = await new JwtService({ secret: 'x'.repeat(32) }).signAsync({
        sub: userId,
        sid: 'any',
        role: 'admin',
        teamId,
      });

      await me(forged).expect(401);
    });

    it('rejects an expired token', async () => {
      const expired = await new JwtService({ secret: JWT_SECRET }).signAsync(
        { sub: userId, sid: 'any', role: 'member', teamId },
        { expiresIn: -10 },
      );

      await me(expired).expect(401);
    });

    it('keeps /health public', async () => {
      await http().get('/health').expect(200);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const session = await login();

      const res = await refresh(session.refresh).expect(204);
      const { values } = readSetCookies(res);

      expect(values.crm_refresh).toBeDefined();
      expect(values.crm_refresh).not.toBe(session.refresh);
      expect(sessionIdOf(values.crm_refresh ?? '')).toBe(sessionIdOf(session.refresh));
      await me(values.crm_access ?? '').expect(200);
    });

    it('rejects a missing or malformed token and clears the cookies', async () => {
      await http().post('/auth/refresh').expect(401);
      const res = await refresh('garbage').expect(401);

      expect(readSetCookies(res).values).toEqual({ crm_access: '', crm_refresh: '' });
    });

    it('tolerates the just-replaced token within the grace period, keeping the cookies', async () => {
      const session = await login();
      const rotated = readSetCookies(await refresh(session.refresh).expect(204)).values.crm_refresh;

      const late = await refresh(session.refresh).expect(401);

      // The winning refresh set the cookies; clearing them here would sign the user out.
      expect(late.headers['set-cookie']).toBeUndefined();
      await refresh(rotated ?? '').expect(204);
    });

    it('does not let a made-up secret end the session', async () => {
      const session = await login();
      const forged = `${sessionIdOf(session.refresh)}.${'A'.repeat(43)}`;

      await refresh(forged).expect(401);

      await refresh(session.refresh).expect(204);
    });

    it('revokes the whole session when an old token is reused later', async () => {
      const session = await login();
      const rotated = readSetCookies(await refresh(session.refresh).expect(204)).values.crm_refresh;
      await prisma.session.update({
        where: { id: sessionIdOf(session.refresh) },
        data: { rotatedAt: new Date(Date.now() - 60_000) },
      });

      await refresh(session.refresh).expect(401);

      await refresh(rotated ?? '').expect(401);
    });

    it('ends a session idle for 7 days', async () => {
      const session = await login();
      await prisma.session.update({
        where: { id: sessionIdOf(session.refresh) },
        data: { idleExpiresAt: new Date(Date.now() - 1000) },
      });

      await refresh(session.refresh).expect(401);
    });

    it('ends a session 30 days after sign-in, however active', async () => {
      const session = await login();
      await prisma.session.update({
        where: { id: sessionIdOf(session.refresh) },
        data: { absoluteExpiresAt: new Date(Date.now() - 1000) },
      });

      await refresh(session.refresh).expect(401);
    });

    it('never moves the idle expiry past the absolute one', async () => {
      const session = await login();
      const absoluteExpiresAt = new Date(Date.now() + 60 * 60_000);
      await prisma.session.update({
        where: { id: sessionIdOf(session.refresh) },
        data: { absoluteExpiresAt },
      });

      await refresh(session.refresh).expect(204);

      const stored = await prisma.session.findUniqueOrThrow({
        where: { id: sessionIdOf(session.refresh) },
      });
      expect(stored.idleExpiresAt).toEqual(absoluteExpiresAt);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session and clears the cookies', async () => {
      const session = await login();

      const res = await http()
        .post('/auth/logout')
        .set('Cookie', `crm_refresh=${session.refresh}`)
        .expect(204);

      expect(readSetCookies(res).values).toEqual({ crm_access: '', crm_refresh: '' });
      await refresh(session.refresh).expect(401);
    });

    it('works without any cookie', async () => {
      await http().post('/auth/logout').expect(204);
    });
  });

  describe('POST /auth/change-password', () => {
    const email = 'change-password-e2e@nova.test';
    const changePassword = (access: string, body: object) =>
      http().post('/auth/change-password').set('Cookie', `crm_access=${access}`).send(body);

    beforeAll(async () => {
      await createUser(email);
    });

    it('rejects a wrong current password with 403', async () => {
      const { access } = await login(email);

      await changePassword(access, { currentPassword: 'wrong-one', newPassword: 'new-password-1' })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'auth.wrong_password',
            errors: { currentPassword: ['Current password is incorrect.'] },
          }),
        );
    });

    it('rejects a short new password with 400', async () => {
      const { access } = await login(email);

      await changePassword(access, { currentPassword: PASSWORD, newPassword: 'short' }).expect(400);
    });

    it('changes the password, keeps this session and revokes the others', async () => {
      const other = await login(email);
      const current = await login(email);

      await changePassword(current.access, {
        currentPassword: PASSWORD,
        newPassword: 'new-password-1',
      }).expect(204);

      await refresh(other.refresh).expect(401);
      await refresh(current.refresh).expect(204);
      await login(email, 'new-password-1');
      await http().post('/auth/login').send({ email, password: PASSWORD }).expect(401);
    });
  });
});
