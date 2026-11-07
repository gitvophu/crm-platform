import {
  CONTACT_PROBLEMS,
  type ContactDto,
  type ContactListQuery,
  type createContactInput,
  OWNER_ME,
  type Page,
  type updateContactInput,
} from '@crm/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { z } from 'zod';

import { type Actor, canAssignOwner, canEdit, teamScope } from '@/access/access.js';
import { AppProblem } from '@/errors/app-problem.js';
import type { Contact } from '@/generated/prisma/client.js';
import { UsersService } from '@/modules/identity/index.js';
import { toContactDto } from './contacts.mapper.js';
import { ContactsRepository } from './contacts.repository.js';

type CreateInput = z.output<typeof createContactInput>;
type UpdateInput = z.output<typeof updateContactInput>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () =>
  new AppProblem(
    HttpStatus.NOT_FOUND,
    CONTACT_PROBLEMS.notFound,
    'This contact does not exist or is not in your team.',
  );
const forbidden = (detail: string) =>
  new AppProblem(HttpStatus.FORBIDDEN, CONTACT_PROBLEMS.forbidden, detail);
const invalidOwner = () => {
  const detail = 'Choose an owner in the contact’s team.';
  return new AppProblem(HttpStatus.BAD_REQUEST, CONTACT_PROBLEMS.invalidOwner, detail, {
    ownerId: [detail],
  });
};

/** Contacts: business rules and access (ADR-0005). The model module for the ones after it. */
@Injectable()
export class ContactsService {
  constructor(
    private readonly repository: ContactsRepository,
    private readonly users: UsersService,
  ) {}

  async list(actor: Actor, query: ContactListQuery): Promise<Page<ContactDto>> {
    const { rows, total } = await this.repository.list(teamScope(actor), {
      q: query.q,
      ownerId: query.owner === OWNER_ME ? actor.id : query.owner,
      stages: query.stage,
      archived: query.archived ?? false,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: await this.toDtos(actor, rows),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(actor: Actor, id: string): Promise<ContactDto> {
    return this.toDto(actor, await this.load(actor, id));
  }

  async create(actor: Actor, input: CreateInput): Promise<ContactDto> {
    const { teamId: requestedTeam, ownerId: requestedOwner, ...fields } = input;
    if (requestedTeam && requestedTeam !== actor.teamId && actor.role !== 'admin') {
      throw forbidden('You can only add contacts to your own team.');
    }
    const teamId = requestedTeam ?? actor.teamId;
    const ownerId = requestedOwner ?? actor.id;
    if (ownerId !== actor.id && !canAssignOwner(actor)) {
      throw forbidden('Only a manager can choose another owner.');
    }
    await this.assertOwnerInTeam(ownerId, teamId);
    const contact = await this.repository.create({ ...fields, teamId, ownerId });
    return this.toDto(actor, contact);
  }

  async update(actor: Actor, id: string, input: UpdateInput): Promise<ContactDto> {
    const contact = await this.loadEditable(actor, id);
    if (input.ownerId !== undefined && input.ownerId !== contact.ownerId) {
      if (!canAssignOwner(actor)) throw forbidden('Only a manager can change the owner.');
      await this.assertOwnerInTeam(input.ownerId, contact.teamId);
    }
    return this.toDto(actor, await this.repository.update(id, input));
  }

  async archive(actor: Actor, id: string): Promise<ContactDto> {
    const contact = await this.loadEditable(actor, id);
    if (contact.archivedAt) return this.toDto(actor, contact);
    return this.toDto(actor, await this.repository.update(id, { archivedAt: new Date() }));
  }

  /** May fail with 409 `contact.email_taken`: another active contact took the email meanwhile. */
  async restore(actor: Actor, id: string): Promise<ContactDto> {
    const contact = await this.loadEditable(actor, id);
    if (!contact.archivedAt) return this.toDto(actor, contact);
    return this.toDto(actor, await this.repository.update(id, { archivedAt: null }));
  }

  /** 404 for an unknown id and for a contact of another team alike: nothing leaks. */
  private async load(actor: Actor, id: string): Promise<Contact> {
    const contact = UUID.test(id) ? await this.repository.findById(teamScope(actor), id) : null;
    if (!contact) throw notFound();
    return contact;
  }

  private async loadEditable(actor: Actor, id: string): Promise<Contact> {
    const contact = await this.load(actor, id);
    if (!canEdit(actor, contact)) {
      throw forbidden('Only the owner or a manager of the team can change this contact.');
    }
    return contact;
  }

  private async assertOwnerInTeam(ownerId: string, teamId: string): Promise<void> {
    const owner = await this.users.findById(ownerId);
    if (owner?.team.id !== teamId) throw invalidOwner();
  }

  private async toDto(actor: Actor, contact: Contact): Promise<ContactDto> {
    const [dto] = await this.toDtos(actor, [contact]);
    return dto!;
  }

  /** Two calls to identity for the whole page (owners, teams), not one per contact. */
  private async toDtos(actor: Actor, contacts: Contact[]): Promise<ContactDto[]> {
    const [owners, teams] = await Promise.all([
      this.users.findByIds(contacts.map((contact) => contact.ownerId)),
      this.users.findTeamNames(contacts.map((contact) => contact.teamId)),
    ]);
    return contacts.map((contact) =>
      toContactDto(
        contact,
        owners.get(contact.ownerId),
        teams.get(contact.teamId),
        canEdit(actor, contact),
      ),
    );
  }
}
