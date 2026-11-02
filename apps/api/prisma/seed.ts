// Dev data for `make seed` (slice 1.2): teams and users to sign in with. Slice 1.8 extends it
// with Nova Agency's clients, deals and activities. Safe to run again: upserts by unique key.
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client.js';
import type { Role } from '@/generated/prisma/enums.js';

/** Shared by every seed user; dev only, documented in README. */
const SEED_PASSWORD = 'nova-dev-password';

const teams = ['Growth', 'Brand'];

const users: { email: string; name: string; role: Role; team: string }[] = [
  { email: 'admin@nova.test', name: 'Mai Nguyen', role: 'admin', team: 'Growth' },
  { email: 'manager@nova.test', name: 'Linh Tran', role: 'manager', team: 'Growth' },
  { email: 'member@nova.test', name: 'Duc Pham', role: 'member', team: 'Growth' },
  { email: 'brand@nova.test', name: 'An Le', role: 'member', team: 'Brand' },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const teamIds = new Map<string, string>();
  for (const name of teams) {
    const team = await prisma.team.upsert({ where: { name }, create: { name }, update: {} });
    teamIds.set(name, team.id);
  }

  const passwordHash = await hash(SEED_PASSWORD);
  for (const { email, name, role, team } of users) {
    const data = { name, role, teamId: teamIds.get(team)!, passwordHash };
    // Running the seed again resets the password, so the README password always works.
    await prisma.user.upsert({ where: { email }, create: { email, ...data }, update: data });
  }

  console.log(`Seeded ${teams.length} teams, ${users.length} users (password: ${SEED_PASSWORD})`);
} finally {
  await prisma.$disconnect();
}
