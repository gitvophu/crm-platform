import type { ContactDto, UserSummary } from '@crm/shared';

import type { Contact } from '@/generated/prisma/client.js';

/** A contact for the API: owner and team names come from identity (one batch per page). */
export function toContactDto(
  contact: Contact,
  owner: UserSummary | undefined,
  teamName: string | undefined,
  canEdit: boolean,
): ContactDto {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    stage: contact.stage,
    notes: contact.notes,
    // No FK across modules (ADR-0001): the owner may be gone; the contact must still show.
    owner: { id: contact.ownerId, name: owner?.name ?? 'Former user' },
    team: { id: contact.teamId, name: teamName ?? 'Former team' },
    archivedAt: contact.archivedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    permissions: { canEdit },
  };
}
