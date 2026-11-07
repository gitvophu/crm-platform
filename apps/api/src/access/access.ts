import type { Role } from '@crm/shared';

/** Who acts: the fields of the access token that decide access (ADR-0005). */
export interface Actor {
  id: string;
  role: Role;
  teamId: string;
}

/** Any business record: it has an owner and belongs to a team (ADR-0005). */
export interface OwnedRecord {
  ownerId: string;
  teamId: string;
}

/**
 * The `where` condition every query of a business table must include: admins see every team,
 * everyone else only their own.
 */
export function teamScope(actor: Actor): { teamId?: string } {
  return actor.role === 'admin' ? {} : { teamId: actor.teamId };
}

export function canSee(actor: Actor, record: OwnedRecord): boolean {
  return actor.role === 'admin' || record.teamId === actor.teamId;
}

/** Edit, archive, restore: managers for their team, members for their own records. */
export function canEdit(actor: Actor, record: OwnedRecord): boolean {
  if (!canSee(actor, record)) return false;
  return actor.role !== 'member' || record.ownerId === actor.id;
}

/** Pick or change the owner of a record (someone of the record's team). */
export function canAssignOwner(actor: Actor): boolean {
  return actor.role !== 'member';
}
