import type { ContactDto, ContactTagDto, CountryCode, UserSummary } from '@crm/shared';

import type { Tag } from '@/generated/prisma/client.js';
import type { ContactRow } from './contacts.repository.js';

export function toTagDto(tag: Tag): ContactTagDto {
  return { id: tag.id, name: tag.name, color: tag.color };
}

/** A contact for the API: the salesperson's name comes from identity (one batch per page). */
export function toContactDto(
  contact: ContactRow,
  salesperson: UserSummary | undefined,
  peopleCount: number | null,
): ContactDto {
  const { parent, industry } = contact;
  return {
    id: contact.id,
    type: contact.isCompany ? 'company' : 'person',
    name: contact.name,
    company: parent && { id: parent.id, name: parent.name, archived: parent.archivedAt !== null },
    email: contact.email,
    phone: contact.phone,
    website: contact.website,
    jobTitle: contact.jobTitle,
    street: contact.street,
    city: contact.city,
    // Written only through the input schema, which accepts ISO codes only.
    countryCode: contact.countryCode as CountryCode | null,
    taxId: contact.taxId,
    industry: industry && { id: industry.id, name: industry.name },
    tags: contact.tags.map(({ tag }) => toTagDto(tag)),
    // No FK across modules (ADR-0001): the user may be gone; the contact must still show.
    salesperson: contact.salespersonId
      ? { id: contact.salespersonId, name: salesperson?.name ?? 'Former user' }
      : null,
    notes: contact.notes,
    peopleCount,
    archivedAt: contact.archivedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}
