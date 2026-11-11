import {
  CONTACT_PICKER_SIZE,
  type ContactSort,
  type ContactSortField,
  type ContactSyncedField,
  type ContactType,
  parseSort,
} from '@crm/shared';
import { Injectable } from '@nestjs/common';

import { type Contact, Prisma } from '@/generated/prisma/client.js';
import { isUniqueViolation } from '@/prisma/prisma-errors.js';
import { PrismaService } from '@/prisma/prisma.service.js';

export interface ContactFilter {
  q?: string;
  type?: ContactType;
  companyId?: string;
  salespersonId?: string;
  tagId?: string;
  email?: string;
  /** `true`: archived only, `false`: active only, `undefined`: both. */
  archived?: boolean;
  sort: ContactSort;
  page: number;
  pageSize: number;
}

/** What the service writes: the columns plus the full list of tags when it changes. */
export type ContactWrite = Omit<Prisma.ContactUncheckedCreateInput, 'tags'> & { tagIds?: string[] };
export type ContactChange = Omit<Prisma.ContactUncheckedUpdateInput, 'tags'> & {
  tagIds?: string[];
};

/** Values of the fields a person takes from their company (slice 1.4, Q6). */
export type SyncedValues = Pick<Contact, ContactSyncedField>;

const { SortOrder, NullsOrder, QueryMode, ContactScalarFieldEnum: Column } = Prisma;

/** A contact with what its DTO shows: industry, tags, and the company of a person. */
const withRelations = {
  industry: true,
  tags: { include: { tag: true }, orderBy: { tag: { name: SortOrder.asc } } },
  parent: { select: { id: true, name: true, archivedAt: true } },
} satisfies Prisma.ContactInclude;

export type ContactRow = Prisma.ContactGetPayload<{ include: typeof withRelations }>;

type OrderBy = Prisma.ContactOrderByWithRelationInput[];

/** Columns of each `sort` field. Optional columns put their empty values last. */
const ORDER_BY: Record<ContactSortField, (direction: Prisma.SortOrder) => OrderBy> = {
  name: (direction) => [{ name: direction }],
  email: (direction) => [{ email: { sort: direction, nulls: NullsOrder.last } }],
  createdAt: (direction) => [{ createdAt: direction }],
  updatedAt: (direction) => [{ updatedAt: direction }],
};

/** Columns a search looks in. */
const SEARCH_COLUMNS = [Column.name, Column.email, Column.phone] as const;

function orderBy(sort: ContactSort): OrderBy {
  const { field, descending } = parseSort(sort);
  const direction = descending ? SortOrder.desc : SortOrder.asc;
  // A unique last column keeps the order stable across pages.
  return [...ORDER_BY[field](direction), { id: direction }];
}

/** Every word of the search must appear in the name, email or phone. */
function search(q: string | undefined): Prisma.ContactWhereInput[] {
  const words = q?.split(/\s+/).filter(Boolean) ?? [];
  return words.map((word) => ({
    OR: SEARCH_COLUMNS.map((column) => ({
      [column]: { contains: word, mode: QueryMode.insensitive },
    })),
  }));
}

function archivedWhere(archived: boolean | undefined): Prisma.ContactWhereInput {
  if (archived === undefined) return {};
  return { archivedAt: archived ? { not: null } : null };
}

/** Replace the tags of a contact by `tagIds`, or leave them when undefined. */
function tagsWrite(tagIds: string[] | undefined) {
  if (tagIds === undefined) return undefined;
  return { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) };
}

/** The only place that reads and writes the `contacts` schema (ADR-0003). */
@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ContactFilter) {
    const where: Prisma.ContactWhereInput = {
      isCompany: filter.type === undefined ? undefined : filter.type === 'company',
      parentId: filter.companyId,
      salespersonId: filter.salespersonId,
      email: filter.email,
      tags: filter.tagId ? { some: { tagId: filter.tagId } } : undefined,
      ...archivedWhere(filter.archived),
      AND: search(filter.q),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        include: withRelations,
        orderBy: orderBy(filter.sort),
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.contact.findUnique({ where: { id }, include: withRelations });
  }

  /** Active people of each company among `companyIds`: one query for a whole page. */
  async countPeople(companyIds: string[]): Promise<Map<string, number>> {
    if (companyIds.length === 0) return new Map();
    const groups = await this.prisma.contact.groupBy({
      by: [Column.parentId],
      where: { parentId: { in: companyIds }, archivedAt: null },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.parentId!, group._count._all]));
  }

  /** Any person (archived too) still points to the company. */
  async hasPeople(companyId: string): Promise<boolean> {
    return (await this.prisma.contact.count({ where: { parentId: companyId }, take: 1 })) > 0;
  }

  create({ tagIds, ...data }: ContactWrite) {
    return this.prisma.contact.create({
      data: { ...data, tags: { create: tagIds?.map((tagId) => ({ tagId })) } },
      include: withRelations,
    });
  }

  /**
   * The caller has checked the rules. `syncPeople`: the values a company passes on to its people
   * (slice 1.4, Q6), written in the same transaction.
   */
  update(id: string, { tagIds, ...data }: ContactChange, syncPeople?: Partial<SyncedValues>) {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.update({
        where: { id },
        data: { ...data, tags: tagsWrite(tagIds) },
        include: withRelations,
      });
      if (syncPeople && Object.keys(syncPeople).length > 0) {
        await tx.contact.updateMany({ where: { parentId: id }, data: syncPeople });
      }
      return contact;
    });
  }

  findIndustry(id: string) {
    return this.prisma.industry.findFirst({ where: { id, archivedAt: null } });
  }

  listIndustries() {
    return this.prisma.industry.findMany({
      where: { archivedAt: null },
      orderBy: [{ name: SortOrder.asc }],
    });
  }

  countTags(ids: string[]) {
    return this.prisma.tag.count({ where: { id: { in: ids } } });
  }

  listTags(q: string | undefined) {
    return this.prisma.tag.findMany({
      where: q ? { name: { contains: q, mode: QueryMode.insensitive } } : undefined,
      orderBy: [{ name: SortOrder.asc }, { id: SortOrder.asc }],
      take: q ? CONTACT_PICKER_SIZE : undefined,
    });
  }

  findTagByKey(nameKey: string) {
    return this.prisma.tag.findUnique({ where: { nameKey } });
  }

  countAllTags() {
    return this.prisma.tag.count();
  }

  /** Created meanwhile by another request (unique `name_key`): that tag. */
  async createTag(data: { name: string; nameKey: string; color: number }) {
    try {
      return await this.prisma.tag.create({ data });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.prisma.tag.findUniqueOrThrow({ where: { nameKey: data.nameKey } });
    }
  }
}
