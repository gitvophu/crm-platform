// Dev data for `make seed`: teams and users to sign in with (slice 1.2), their contacts (slice 1.3).
// Slice 1.8 extends it with Nova Agency's companies, deals and activities. Safe to run again:
// upserts by unique key, or by a fixed id where the data has none.
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client.js';
import type { ContactStage, Role } from '@/generated/prisma/enums.js';

/** Shared by every seed user; dev only, documented in README. */
const SEED_PASSWORD = 'nova-dev-password';

const teams = ['Growth', 'Brand'];

const users: { email: string; name: string; role: Role; team: string }[] = [
  { email: 'admin@nova.test', name: 'Mai Nguyen', role: 'admin', team: 'Growth' },
  { email: 'manager@nova.test', name: 'Linh Tran', role: 'manager', team: 'Growth' },
  { email: 'member@nova.test', name: 'Duc Pham', role: 'member', team: 'Growth' },
  { email: 'brand@nova.test', name: 'An Le', role: 'member', team: 'Brand' },
];

interface SeedContact {
  owner: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle: string;
  stage: ContactStage;
  notes?: string;
}

/** Owner by email; `id` fixed so the seed updates instead of adding a copy each run. */
const contacts = (
  [
    {
      owner: 'manager@nova.test',
      firstName: 'Hana',
      lastName: 'Vo',
      email: 'hana@greenleafcoffee.vn',
      phone: '+84 90 123 4567',
      jobTitle: 'Marketing Director',
      stage: 'customer',
      notes: 'Monthly retainer since March. Prefers calls on Tuesday.',
    },
    {
      owner: 'member@nova.test',
      firstName: 'Minh',
      lastName: 'Nguyen',
      email: 'minh.nguyen@saigonbikes.com',
      phone: '+84 91 555 0182',
      jobTitle: 'Founder',
      stage: 'prospect',
    },
    {
      owner: 'manager@nova.test',
      firstName: 'Thao',
      lastName: 'Le',
      email: 'thao@lotusspa.vn',
      jobTitle: 'Owner',
      stage: 'lead',
      notes: 'Met at Saigon Retail Expo.',
    },
    {
      owner: 'admin@nova.test',
      firstName: 'Quang',
      lastName: 'Do',
      email: 'quang.do@techhub.io',
      phone: '+84 98 220 7714',
      jobTitle: 'Head of Growth',
      stage: 'customer',
    },
    {
      owner: 'member@nova.test',
      firstName: 'Anh',
      lastName: 'Bui',
      phone: '+84 93 410 9921',
      jobTitle: 'Brand Manager',
      stage: 'lead',
    },
    {
      owner: 'manager@nova.test',
      firstName: 'Khoa',
      lastName: 'Truong',
      email: 'khoa@mekongfoods.vn',
      phone: '+84 97 300 1188',
      jobTitle: 'CEO',
      stage: 'churned',
      notes: 'Paused the SEO contract in August.',
    },
    {
      owner: 'manager@nova.test',
      firstName: 'Lan',
      lastName: 'Pham',
      email: 'lan.pham@urbanyoga.vn',
      jobTitle: 'Studio Manager',
      stage: 'prospect',
    },
    {
      owner: 'member@nova.test',
      firstName: 'Tuan',
      lastName: 'Hoang',
      email: 'tuan@hoangfurniture.com',
      phone: '+84 90 777 4410',
      jobTitle: 'Sales Director',
      stage: 'customer',
    },
    {
      owner: 'member@nova.test',
      firstName: 'Ngoc',
      lastName: 'Dinh',
      email: 'ngoc@dinhdental.vn',
      jobTitle: 'Clinic Manager',
      stage: 'lead',
    },
    {
      owner: 'manager@nova.test',
      firstName: 'Phuong',
      lastName: 'Mai',
      email: 'phuong.mai@riverhotel.vn',
      phone: '+84 28 3822 1100',
      jobTitle: 'Revenue Manager',
      stage: 'customer',
      notes: 'Ads + SEO bundle, renews in January.',
    },
    {
      owner: 'admin@nova.test',
      firstName: 'Bao',
      lastName: 'Chau',
      email: 'bao@chaufashion.com',
      jobTitle: 'E-commerce Lead',
      stage: 'prospect',
    },
    {
      owner: 'member@nova.test',
      firstName: 'Duy',
      lastName: 'Ta',
      email: 'duy.ta@fitbox.vn',
      jobTitle: 'Co-founder',
      stage: 'lead',
    },
    {
      owner: 'manager@nova.test',
      firstName: 'Yen',
      lastName: 'Ho',
      email: 'yen.ho@phoxua.vn',
      phone: '+84 90 222 3344',
      jobTitle: 'Owner',
      stage: 'churned',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Kim',
      lastName: 'Nguyen',
      email: 'kim@lumiere-skincare.vn',
      phone: '+84 93 888 1200',
      jobTitle: 'Brand Director',
      stage: 'customer',
      notes: 'Rebrand project, launch in Q1.',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Son',
      lastName: 'Vu',
      email: 'son.vu@vuarchitects.vn',
      jobTitle: 'Partner',
      stage: 'prospect',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Trang',
      lastName: 'Ly',
      email: 'trang@lyteahouse.vn',
      jobTitle: 'Founder',
      stage: 'lead',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Hieu',
      lastName: 'Phan',
      email: 'hieu.phan@ecomart.vn',
      phone: '+84 91 400 5566',
      jobTitle: 'Marketing Manager',
      stage: 'customer',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Thu',
      lastName: 'Cao',
      jobTitle: 'Art Director',
      stage: 'lead',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Long',
      lastName: 'Dang',
      email: 'long@dangmotors.vn',
      jobTitle: 'General Manager',
      stage: 'churned',
    },
    {
      owner: 'brand@nova.test',
      firstName: 'Vy',
      lastName: 'Lam',
      email: 'vy.lam@petcorner.vn',
      jobTitle: 'Owner',
      stage: 'prospect',
    },
  ] satisfies SeedContact[]
).map((contact, index) => ({
  ...contact,
  id: `01a1c000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`,
}));

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
  const usersByEmail = new Map<string, { id: string; teamId: string }>();
  for (const { email, name, role, team } of users) {
    const data = { name, role, teamId: teamIds.get(team)!, passwordHash };
    // Running the seed again resets the password, so the README password always works.
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, ...data },
      update: data,
    });
    usersByEmail.set(email, user);
  }

  // owner_id and team_id point into identity without FK (ADR-0001): the seed keeps them consistent.
  for (const { id, owner, ...fields } of contacts) {
    const { id: ownerId, teamId } = usersByEmail.get(owner)!;
    const data = { ...fields, ownerId, teamId, archivedAt: null };
    await prisma.contact.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  console.log(
    `Seeded ${teams.length} teams, ${users.length} users (password: ${SEED_PASSWORD}), ${contacts.length} contacts`,
  );
} finally {
  await prisma.$disconnect();
}
