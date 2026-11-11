import {
  CONTACT_ARCHIVED_ALL,
  CONTACT_PROBLEMS,
  CONTACT_SYNCED_FIELDS,
  CONTACT_TAG_COLOR_COUNT,
  type ContactDto,
  type ContactListQuery,
  type ContactTagDto,
  type ContactTagListQuery,
  type createContactInput,
  type createContactTagInput,
  type IndustryDto,
  OWNER_ME,
  type Page,
  type updateContactInput,
} from '@crm/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { z } from 'zod';

import { AppProblem } from '@/errors/app-problem.js';
import { type SessionUser, UsersService } from '@/modules/identity/index.js';
import { toContactDto, toTagDto } from './contacts.mapper.js';
import {
  type ContactChange,
  type ContactRow,
  ContactsRepository,
  type SyncedValues,
} from './contacts.repository.js';

type CreateInput = z.output<typeof createContactInput>;
type UpdateInput = z.output<typeof updateContactInput>;
type CreateTagInput = z.output<typeof createContactTagInput>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () =>
  new AppProblem(HttpStatus.NOT_FOUND, CONTACT_PROBLEMS.notFound, 'This contact does not exist.');

/** A 400 on one field of the form. */
const fieldProblem = (code: string, field: string, detail: string) =>
  new AppProblem(HttpStatus.BAD_REQUEST, code, detail, { [field]: [detail] });

/** Tags are the same when their names differ only in case. */
const tagKey = (name: string) => name.toLowerCase();

const invalidCompany = (detail: string) =>
  fieldProblem(CONTACT_PROBLEMS.invalidCompany, 'companyId', detail);

/** The synced fields of a company, as a person copies them (slice 1.4, Q6). */
function syncedFrom(company: ContactRow): SyncedValues {
  return {
    street: company.street,
    city: company.city,
    countryCode: company.countryCode,
    taxId: company.taxId,
    industryId: company.industryId,
  };
}

/**
 * The synced fields `input` changes on `company`: what it passes on to its people. Values sent
 * unchanged (the form sends every field) do not touch the people.
 */
function syncedChanges(company: ContactRow, input: UpdateInput): Partial<SyncedValues> {
  return Object.fromEntries(
    CONTACT_SYNCED_FIELDS.filter(
      (field) => input[field] !== undefined && input[field] !== company[field],
    ).map((field) => [field, input[field]]),
  );
}

/**
 * Contacts as Odoo's res.partner (slice 1.4): companies and people, a person's address, tax ID and
 * industry follow their company. Every signed-in user sees and edits every contact (spec Q15).
 */
@Injectable()
export class ContactsService {
  constructor(
    private readonly repository: ContactsRepository,
    private readonly users: UsersService,
  ) {}

  async list(actor: SessionUser, query: ContactListQuery): Promise<Page<ContactDto>> {
    const { rows, total } = await this.repository.list({
      q: query.q,
      type: query.type,
      companyId: query.companyId,
      salespersonId: query.salesperson === OWNER_ME ? actor.id : query.salesperson,
      tagId: query.tag,
      email: query.email,
      archived: query.archived === CONTACT_ARCHIVED_ALL ? undefined : (query.archived ?? false),
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: await this.toDtos(rows),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(id: string): Promise<ContactDto> {
    return this.toDto(await this.load(id));
  }

  async create(input: CreateInput): Promise<ContactDto> {
    const { type, companyId, ...columns } = input;
    const isCompany = type === 'company';
    if (isCompany && companyId) throw invalidCompany('A company cannot belong to another company.');
    const company = companyId ? await this.loadCompany(companyId) : null;
    await this.assertReferences(input);

    const contact = await this.repository.create({
      ...columns,
      isCompany,
      parentId: company?.id ?? null,
      jobTitle: isCompany ? null : columns.jobTitle,
      ...(company && syncedFrom(company)),
      salespersonId: columns.salespersonId ?? company?.salespersonId ?? null,
    });
    return this.toDto(contact);
  }

  async update(id: string, input: UpdateInput): Promise<ContactDto> {
    const contact = await this.load(id);
    const { type, companyId, ...columns } = input;
    const isCompany = (type ?? (contact.isCompany ? 'company' : 'person')) === 'company';
    if (isCompany && companyId) {
      throw invalidCompany('A company cannot belong to another company.');
    }
    if (contact.isCompany && !isCompany && (await this.repository.hasPeople(id))) {
      const detail = 'This company has people. Move them to another company first.';
      throw new AppProblem(HttpStatus.CONFLICT, CONTACT_PROBLEMS.companyHasPeople, detail, {
        type: [detail],
      });
    }

    const parentId = isCompany ? null : companyId !== undefined ? companyId : contact.parentId;
    if (parentId === id) throw invalidCompany('A contact cannot belong to itself.');
    // A new company must be active; one the person already had may have been archived since.
    const company =
      parentId === null
        ? null
        : parentId === contact.parentId
          ? await this.repository.findById(parentId)
          : await this.loadCompany(parentId);
    await this.assertReferences(input, contact);

    const change: ContactChange = {
      ...columns,
      isCompany,
      parentId,
      ...(isCompany && { jobTitle: null }),
      ...(company && syncedFrom(company)),
    };
    // A person joining a company without a salesperson takes the company's (Odoo `user_id`).
    // Once in it, an empty salesperson stays empty.
    const joining = company !== null && parentId !== contact.parentId;
    const salespersonId =
      input.salespersonId !== undefined ? input.salespersonId : contact.salespersonId;
    if (joining && !salespersonId) change.salespersonId = company.salespersonId;

    const updated = await this.repository.update(
      id,
      change,
      isCompany ? syncedChanges(contact, input) : undefined,
    );
    return this.toDto(updated);
  }

  async archive(id: string): Promise<ContactDto> {
    const contact = await this.load(id);
    if (contact.archivedAt) return this.toDto(contact);
    return this.toDto(await this.repository.update(id, { archivedAt: new Date() }));
  }

  async restore(id: string): Promise<ContactDto> {
    const contact = await this.load(id);
    if (!contact.archivedAt) return this.toDto(contact);
    return this.toDto(await this.repository.update(id, { archivedAt: null }));
  }

  async listIndustries(): Promise<IndustryDto[]> {
    return (await this.repository.listIndustries()).map(({ id, name }) => ({ id, name }));
  }

  async listTags(query: ContactTagListQuery): Promise<ContactTagDto[]> {
    return (await this.repository.listTags(query.q)).map(toTagDto);
  }

  /**
   * Same name, whatever the case: the existing tag (unique `name_key`, so two requests at once
   * still make one tag). New tags take the palette colors in turn.
   */
  async createTag(input: CreateTagInput): Promise<ContactTagDto> {
    const nameKey = tagKey(input.name);
    const existing = await this.repository.findTagByKey(nameKey);
    if (existing) return toTagDto(existing);
    const color = (await this.repository.countAllTags()) % CONTACT_TAG_COLOR_COUNT;
    return toTagDto(await this.repository.createTag({ name: input.name, nameKey, color }));
  }

  private async load(id: string): Promise<ContactRow> {
    const contact = UUID.test(id) ? await this.repository.findById(id) : null;
    if (!contact) throw notFound();
    return contact;
  }

  /** The company picked for a person: an active company. */
  private async loadCompany(id: string): Promise<ContactRow> {
    const company = await this.repository.findById(id);
    if (!company?.isCompany || company.archivedAt) {
      throw invalidCompany('Choose an active company.');
    }
    return company;
  }

  /**
   * Salesperson, industry and tags sent must exist. Values the contact already has pass: a user
   * who left or an archived industry must not block an unrelated edit.
   */
  private async assertReferences(input: UpdateInput, current?: ContactRow): Promise<void> {
    if (
      input.salespersonId &&
      input.salespersonId !== current?.salespersonId &&
      !(await this.users.findById(input.salespersonId))
    ) {
      throw fieldProblem(
        CONTACT_PROBLEMS.invalidSalesperson,
        'salespersonId',
        'Choose a salesperson.',
      );
    }
    if (
      input.industryId &&
      input.industryId !== current?.industryId &&
      !(await this.repository.findIndustry(input.industryId))
    ) {
      throw fieldProblem(CONTACT_PROBLEMS.invalidIndustry, 'industryId', 'Choose an industry.');
    }
    if (
      input.tagIds?.length &&
      (await this.repository.countTags(input.tagIds)) !== input.tagIds.length
    ) {
      throw fieldProblem(CONTACT_PROBLEMS.invalidTag, 'tagIds', 'One of the tags does not exist.');
    }
  }

  private async toDto(contact: ContactRow): Promise<ContactDto> {
    const [dto] = await this.toDtos([contact]);
    return dto!;
  }

  /** One call to identity and one count of people for the whole page, not one per contact. */
  private async toDtos(contacts: ContactRow[]): Promise<ContactDto[]> {
    const [salespeople, people] = await Promise.all([
      this.users.findByIds(contacts.flatMap((contact) => contact.salespersonId ?? [])),
      this.repository.countPeople(
        contacts.filter((contact) => contact.isCompany).map((contact) => contact.id),
      ),
    ]);
    return contacts.map((contact) =>
      toContactDto(
        contact,
        contact.salespersonId ? salespeople.get(contact.salespersonId) : undefined,
        contact.isCompany ? (people.get(contact.id) ?? 0) : null,
      ),
    );
  }
}
