import { describe, expect, it } from 'vitest';

import { type Actor, canAssignOwner, canEdit, canSee, teamScope } from './access.js';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
const actor = (role: Actor['role'], teamId = TEAM_A): Actor => ({ id: `${role}-1`, role, teamId });

describe('access (ADR-0005)', () => {
  const own = { ownerId: 'member-1', teamId: TEAM_A };
  const colleague = { ownerId: 'someone', teamId: TEAM_A };
  const otherTeam = { ownerId: 'someone', teamId: TEAM_B };

  it.each([
    ['admin', [true, true, true], [true, true, true]],
    ['manager', [true, true, false], [true, true, false]],
    ['member', [true, true, false], [true, false, false]],
  ] as const)('%s: see and edit own, colleague, other team', (role, see, edit) => {
    const records = [own, colleague, otherTeam];

    expect(records.map((record) => canSee(actor(role), record))).toEqual(see);
    expect(records.map((record) => canEdit(actor(role), record))).toEqual(edit);
  });

  it('scopes queries to the team, except for admins', () => {
    expect(teamScope(actor('member'))).toEqual({ teamId: TEAM_A });
    expect(teamScope(actor('manager'))).toEqual({ teamId: TEAM_A });
    expect(teamScope(actor('admin'))).toEqual({});
  });

  it('lets managers and admins assign owners, not members', () => {
    expect([canAssignOwner(actor('admin')), canAssignOwner(actor('manager'))]).toEqual([
      true,
      true,
    ]);
    expect(canAssignOwner(actor('member'))).toBe(false);
  });
});
