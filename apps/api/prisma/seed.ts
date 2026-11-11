// Dev data for `make seed`: teams and users to sign in with (slice 1.2), client companies and
// people (slice 1.4). Slice 1.9 extends it with leads, activities and the rest of Nova Agency.
// Safe to run again: upserts by unique key, or by a fixed id where the data has none.
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';

import { type Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { Role } from '@/generated/prisma/enums.js';

/** Shared by every seed user; dev only, documented in README. */
const SEED_PASSWORD = 'nova-dev-password';

/** A fixed date, so running the seed again does not move it. */
const ARCHIVED_AT = new Date('2026-09-30T10:00:00Z');

const teams = ['Growth', 'Brand'];

const users: { email: string; name: string; role: Role; team: string }[] = [
  { email: 'admin@nova.test', name: 'Mai Nguyen', role: 'admin', team: 'Growth' },
  { email: 'manager@nova.test', name: 'Linh Tran', role: 'manager', team: 'Growth' },
  { email: 'member@nova.test', name: 'Duc Pham', role: 'member', team: 'Growth' },
  { email: 'brand@nova.test', name: 'An Le', role: 'member', team: 'Brand' },
];

const industries = [
  'F&B',
  'Retail',
  'Education',
  'Real Estate',
  'Technology',
  'Beauty & Wellness',
  'Healthcare',
  'Finance',
  'Hospitality',
  'Manufacturing',
  'Other',
];

/** Fixed ids: the seed updates them instead of adding copies. Colors index the web palette. */
const tags = [
  { id: '01a1c0f0-0000-7000-8000-000000000001', name: 'VIP', color: 0 },
  { id: '01a1c0f0-0000-7000-8000-000000000002', name: 'Retainer', color: 1 },
  { id: '01a1c0f0-0000-7000-8000-000000000003', name: 'Referral', color: 2 },
  { id: '01a1c0f0-0000-7000-8000-000000000004', name: 'Influencer', color: 3 },
];

interface SeedCompany {
  key: string;
  name: string;
  industry: string;
  salesperson: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  city: string;
  taxId?: string;
  tags?: string[];
  notes?: string;
  archived?: boolean;
}

/** Client companies of Nova (vision: F&B chains, retail, education, real estate, startups). */
const companies = (
  [
    {
      key: 'greenleaf',
      name: 'Greenleaf Coffee',
      industry: 'F&B',
      salesperson: 'manager@nova.test',
      email: 'hello@greenleafcoffee.vn',
      phone: '+84 28 3822 1100',
      website: 'greenleafcoffee.vn',
      street: '12 Nguyen Hue, District 1',
      city: 'Ho Chi Minh City',
      taxId: '0312345678',
      tags: ['VIP', 'Retainer'],
      notes: '30 stores in HCMC and Hanoi. Performance Ads + Social retainer.',
    },
    {
      key: 'saigonbikes',
      name: 'Saigon Bikes',
      industry: 'Retail',
      salesperson: 'member@nova.test',
      email: 'contact@saigonbikes.com',
      phone: '+84 28 3930 4455',
      website: 'saigonbikes.com',
      street: '88 Le Loi, District 1',
      city: 'Ho Chi Minh City',
      taxId: '0315550182',
    },
    {
      key: 'lotus',
      name: 'Lotus Spa',
      industry: 'Beauty & Wellness',
      salesperson: 'manager@nova.test',
      phone: '+84 24 3936 2200',
      street: '15 Hang Bai',
      city: 'Hanoi',
    },
    {
      key: 'techhub',
      name: 'TechHub',
      industry: 'Technology',
      salesperson: 'admin@nova.test',
      email: 'hi@techhub.io',
      website: 'techhub.io',
      street: '2 Hai Trieu, District 1',
      city: 'Ho Chi Minh City',
      taxId: '0318887714',
      tags: ['Referral'],
    },
    {
      key: 'mekong',
      name: 'Mekong Foods',
      industry: 'F&B',
      salesperson: 'manager@nova.test',
      email: 'info@mekongfoods.vn',
      street: '45 Hoa Binh, Ninh Kieu',
      city: 'Can Tho',
      taxId: '1800123456',
      notes: 'Paused the SEO contract in August.',
    },
    {
      key: 'urbanyoga',
      name: 'Urban Yoga',
      industry: 'Beauty & Wellness',
      salesperson: 'manager@nova.test',
      website: 'urbanyoga.vn',
      street: '21 Thao Dien, Thu Duc',
      city: 'Ho Chi Minh City',
    },
    {
      key: 'hoang',
      name: 'Hoang Furniture',
      industry: 'Retail',
      salesperson: 'member@nova.test',
      phone: '+84 90 777 4410',
      street: '300 Nguyen Van Linh, District 7',
      city: 'Ho Chi Minh City',
      taxId: '0310774410',
    },
    {
      key: 'dinhdental',
      name: 'Dinh Dental',
      industry: 'Healthcare',
      salesperson: 'member@nova.test',
      street: '9 Tran Phu',
      city: 'Da Nang',
    },
    {
      key: 'riverhotel',
      name: 'River Hotel',
      industry: 'Hospitality',
      salesperson: 'manager@nova.test',
      email: 'sales@riverhotel.vn',
      phone: '+84 28 3822 9900',
      website: 'riverhotel.vn',
      street: '1 Ton Duc Thang, District 1',
      city: 'Ho Chi Minh City',
      taxId: '0301234999',
      tags: ['Retainer'],
      notes: 'Ads + SEO bundle, renews in January.',
    },
    {
      key: 'chau',
      name: 'Chau Fashion',
      industry: 'Retail',
      salesperson: 'admin@nova.test',
      website: 'chaufashion.com',
      city: 'Ho Chi Minh City',
    },
    {
      key: 'lumiere',
      name: 'Lumiere Skincare',
      industry: 'Beauty & Wellness',
      salesperson: 'brand@nova.test',
      email: 'hello@lumiere-skincare.vn',
      website: 'lumiere-skincare.vn',
      street: '70 Hai Ba Trung, District 3',
      city: 'Ho Chi Minh City',
      taxId: '0316881200',
      tags: ['VIP'],
      notes: 'Rebrand project, launch in Q1.',
    },
    {
      key: 'vuarch',
      name: 'Vu Architects',
      industry: 'Real Estate',
      salesperson: 'brand@nova.test',
      street: '5 Ly Thai To',
      city: 'Hanoi',
    },
    {
      key: 'ecomart',
      name: 'EcoMart',
      industry: 'Retail',
      salesperson: 'brand@nova.test',
      phone: '+84 28 3456 5566',
      website: 'ecomart.vn',
      street: '120 Cong Hoa, Tan Binh',
      city: 'Ho Chi Minh City',
      taxId: '0317405566',
    },
    {
      key: 'phoxua',
      name: 'Pho Xua',
      industry: 'F&B',
      salesperson: 'manager@nova.test',
      street: '18 Pasteur, District 3',
      city: 'Ho Chi Minh City',
      notes: 'Closed in September.',
      archived: true,
    },
  ] satisfies SeedCompany[]
).map((company, index) => ({
  ...company,
  id: `01a1c001-0000-7000-8000-${String(index + 1).padStart(12, '0')}`,
}));

interface SeedPerson {
  name: string;
  /** Company key; none for an individual client. */
  company?: string;
  jobTitle: string;
  salesperson?: string;
  email?: string;
  phone?: string;
  city?: string;
  tags?: string[];
  notes?: string;
  archived?: boolean;
}

/**
 * People. Ids are the ones of the contacts of slice 1.3, so the seed updates the rows the 1.4
 * migration kept instead of leaving them next to the new ones.
 */
const people = (
  [
    {
      name: 'Hana Vo',
      company: 'greenleaf',
      jobTitle: 'Marketing Director',
      email: 'hana@greenleafcoffee.vn',
      phone: '+84 90 123 4567',
      tags: ['VIP'],
      notes: 'Prefers calls on Tuesday.',
    },
    {
      name: 'Minh Nguyen',
      company: 'saigonbikes',
      jobTitle: 'Founder',
      email: 'minh.nguyen@saigonbikes.com',
      phone: '+84 91 555 0182',
    },
    { name: 'Thao Le', company: 'lotus', jobTitle: 'Owner', email: 'thao@lotusspa.vn' },
    {
      name: 'Quang Do',
      company: 'techhub',
      jobTitle: 'Head of Growth',
      email: 'quang.do@techhub.io',
      phone: '+84 98 220 7714',
    },
    {
      name: 'Anh Bui',
      company: 'greenleaf',
      jobTitle: 'Brand Manager',
      phone: '+84 93 410 9921',
    },
    {
      name: 'Khoa Truong',
      company: 'mekong',
      jobTitle: 'CEO',
      email: 'khoa@mekongfoods.vn',
      phone: '+84 97 300 1188',
    },
    {
      name: 'Lan Pham',
      company: 'urbanyoga',
      jobTitle: 'Studio Manager',
      email: 'lan.pham@urbanyoga.vn',
    },
    {
      name: 'Tuan Hoang',
      company: 'hoang',
      jobTitle: 'Sales Director',
      email: 'tuan@hoangfurniture.com',
    },
    {
      name: 'Ngoc Dinh',
      company: 'dinhdental',
      jobTitle: 'Clinic Manager',
      email: 'ngoc@dinhdental.vn',
    },
    {
      name: 'Phuong Mai',
      company: 'riverhotel',
      jobTitle: 'Revenue Manager',
      email: 'phuong.mai@riverhotel.vn',
    },
    {
      name: 'Bao Chau',
      company: 'chau',
      jobTitle: 'E-commerce Lead',
      email: 'bao@chaufashion.com',
    },
    {
      name: 'Duy Ta',
      jobTitle: 'Fitness creator',
      salesperson: 'member@nova.test',
      email: 'duy.ta@fitbox.vn',
      city: 'Ho Chi Minh City',
      tags: ['Influencer'],
    },
    {
      name: 'Yen Ho',
      company: 'phoxua',
      jobTitle: 'Owner',
      email: 'yen.ho@phoxua.vn',
      phone: '+84 90 222 3344',
    },
    {
      name: 'Kim Nguyen',
      company: 'lumiere',
      jobTitle: 'Brand Director',
      email: 'kim@lumiere-skincare.vn',
      phone: '+84 93 888 1200',
    },
    { name: 'Son Vu', company: 'vuarch', jobTitle: 'Partner', email: 'son.vu@vuarchitects.vn' },
    {
      name: 'Trang Ly',
      jobTitle: 'Tea shop owner',
      salesperson: 'brand@nova.test',
      email: 'trang@lyteahouse.vn',
      city: 'Hanoi',
    },
    {
      name: 'Hieu Phan',
      company: 'ecomart',
      jobTitle: 'Marketing Manager',
      email: 'hieu.phan@ecomart.vn',
      phone: '+84 91 400 5566',
    },
    {
      name: 'Thu Cao',
      jobTitle: 'Freelance art director',
      salesperson: 'brand@nova.test',
      city: 'Da Nang',
      archived: true,
    },
    {
      name: 'Bao Tran',
      company: 'greenleaf',
      jobTitle: 'CEO',
      email: 'bao.tran@greenleafcoffee.vn',
    },
    {
      name: 'Vy Lam',
      jobTitle: 'Pet influencer',
      salesperson: 'brand@nova.test',
      email: 'vy.lam@petcorner.vn',
      city: 'Ho Chi Minh City',
      tags: ['Influencer'],
    },
  ] satisfies SeedPerson[]
).map((person, index) => ({
  ...person,
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

  const industryIds = new Map<string, string>();
  for (const name of industries) {
    const industry = await prisma.industry.upsert({
      where: { name },
      create: { name },
      update: { archivedAt: null },
    });
    industryIds.set(name, industry.id);
  }

  const tagIds = new Map<string, string>();
  for (const { id, ...fields } of tags) {
    const data = { ...fields, nameKey: fields.name.toLowerCase() };
    await prisma.tag.upsert({ where: { id }, create: { id, ...data }, update: data });
    tagIds.set(data.name, id);
  }
  const tagsOf = (names: string[] = []) => ({
    create: names.map((name) => ({ tagId: tagIds.get(name)! })),
  });

  // salesperson_id points into identity without FK (ADR-0001): the seed keeps it consistent.
  const companyRows = new Map<string, Prisma.ContactUncheckedCreateInput>();
  for (const { id, key, industry, salesperson, archived, tags: names, ...fields } of companies) {
    const data = {
      ...fields,
      isCompany: true,
      countryCode: 'VN',
      industryId: industryIds.get(industry)!,
      salespersonId: usersByEmail.get(salesperson)!.id,
      archivedAt: archived ? ARCHIVED_AT : null,
    };
    await prisma.contact.upsert({
      where: { id },
      create: { id, ...data, tags: tagsOf(names) },
      update: { ...data, tags: { deleteMany: {}, ...tagsOf(names) } },
    });
    companyRows.set(key, { id, ...data });
  }

  for (const { id, company, salesperson, archived, tags: names, ...fields } of people) {
    const parent = company ? companyRows.get(company)! : undefined;
    const data = {
      ...fields,
      isCompany: false,
      parentId: parent?.id ?? null,
      // A person takes the address, tax ID and industry of their company (slice 1.4, Q6).
      street: parent?.street ?? null,
      city: parent ? (parent.city ?? null) : (fields.city ?? null),
      countryCode: 'VN',
      taxId: parent?.taxId ?? null,
      industryId: parent?.industryId ?? null,
      salespersonId: salesperson ? usersByEmail.get(salesperson)!.id : parent!.salespersonId,
      archivedAt: archived ? ARCHIVED_AT : null,
    };
    await prisma.contact.upsert({
      where: { id },
      create: { id, ...data, tags: tagsOf(names) },
      update: { ...data, tags: { deleteMany: {}, ...tagsOf(names) } },
    });
  }

  console.log(
    `Seeded ${teams.length} teams, ${users.length} users (password: ${SEED_PASSWORD}), ${companies.length} companies, ${people.length} people`,
  );
} finally {
  await prisma.$disconnect();
}
