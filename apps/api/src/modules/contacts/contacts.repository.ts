import {
  CONTACT_PROBLEMS,
  type ContactListQuery,
  type ContactSort,
  type ContactSortField,
  parseSort,
} from '@crm/shared';
import { HttpStatus, Injectable } from '@nestjs/common';

import { AppProblem } from '@/errors/app-problem.js';
import { Prisma } from '@/generated/prisma/client.js';
import { isUniqueViolation } from '@/prisma/prisma-errors.js';
import { PrismaService } from '@/prisma/prisma.service.js';

/** `teamScope(actor)` of ADR-0005: part of every query below. */
export type TeamScope = { teamId?: string };

export interface ContactFilter {
  q?: string;
  ownerId?: string;
  stages?: ContactListQuery['stage'];
  archived: boolean;
  sort: ContactSort;
  page: number;
  pageSize: number;
}

const EMAIL_TAKEN = 'Another contact of your team already uses this email.';

const { SortOrder, NullsOrder, QueryMode, ContactScalarFieldEnum: Column } = Prisma;

type OrderBy = Prisma.ContactOrderByWithRelationInput[];

/** Columns of each `sort` field. Optional columns put their empty values last. */
const ORDER_BY: Record<ContactSortField, (direction: Prisma.SortOrder) => OrderBy> = {
  name: (direction) => [
    { firstName: direction },
    { lastName: { sort: direction, nulls: NullsOrder.last } },
  ],
  email: (direction) => [{ email: { sort: direction, nulls: NullsOrder.last } }],
  stage: (direction) => [{ stage: direction }],
  createdAt: (direction) => [{ createdAt: direction }],
  updatedAt: (direction) => [{ updatedAt: direction }],
};

/** Columns a search looks in. */
const SEARCH_COLUMNS = [Column.firstName, Column.lastName, Column.email] as const;

function orderBy(sort: ContactSort): OrderBy {
  const { field, descending } = parseSort(sort);
  const direction = descending ? SortOrder.desc : SortOrder.asc;
  // A unique last column keeps the order stable across pages.
  return [...ORDER_BY[field](direction), { id: direction }];
}

/** Every word of the search must appear in the first name, last name or email. */
function search(q: string | undefined): Prisma.ContactWhereInput[] {
  const words = q?.split(/\s+/).filter(Boolean) ?? [];
  return words.map((word) => ({
    OR: SEARCH_COLUMNS.map((column) => ({
      [column]: { contains: word, mode: QueryMode.insensitive },
    })),
  }));
}

/** A unique violation can only be the email of the team (contacts_team_id_email_key). */
function emailTaken(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppProblem(HttpStatus.CONFLICT, CONTACT_PROBLEMS.emailTaken, EMAIL_TAKEN, {
      email: [EMAIL_TAKEN],
    });
  }
  throw error;
}

/** The only place that reads and writes the `contacts` schema (ADR-0003). */
@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(scope: TeamScope, filter: ContactFilter) {
    const where: Prisma.ContactWhereInput = {
      ...scope,
      ownerId: filter.ownerId,
      stage: filter.stages?.length ? { in: filter.stages } : undefined,
      archivedAt: filter.archived ? { not: null } : null,
      AND: search(filter.q),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: orderBy(filter.sort),
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { rows, total };
  }

  findById(scope: TeamScope, id: string) {
    return this.prisma.contact.findFirst({ where: { id, ...scope } });
  }

  create(data: Prisma.ContactUncheckedCreateInput) {
    return this.prisma.contact.create({ data }).catch(emailTaken);
  }

  /** The caller has loaded the contact within its scope and checked `canEdit`. */
  update(id: string, data: Prisma.ContactUncheckedUpdateInput) {
    return this.prisma.contact.update({ where: { id }, data }).catch(emailTaken);
  }
}
