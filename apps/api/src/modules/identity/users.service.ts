import type { UserSummary } from '@crm/shared';
import { Injectable } from '@nestjs/common';

import type { Team, User } from '@/generated/prisma/client.js';
import { IdentityRepository } from './identity.repository.js';

function toSummary(user: User & { team: Team }): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: { id: user.team.id, name: user.team.name },
  };
}

/**
 * Public service of identity (ADR-0001): how other modules learn about users, without reading
 * the `identity` schema. Batch by design: one call per page of records, never one per record.
 */
@Injectable()
export class UsersService {
  constructor(private readonly repository: IdentityRepository) {}

  /** Users found among `ids`, keyed by id. Unknown ids are simply absent. */
  async findByIds(ids: Iterable<string>): Promise<Map<string, UserSummary>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await this.repository.findUsersByIds(unique);
    return new Map(users.map((user) => [user.id, toSummary(user)]));
  }

  async findById(id: string): Promise<UserSummary | undefined> {
    return (await this.findByIds([id])).get(id);
  }

  /** Team names found among `ids`, keyed by id. */
  async findTeamNames(ids: Iterable<string>): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const teams = await this.repository.findTeamsByIds(unique);
    return new Map(teams.map((team) => [team.id, team.name]));
  }

  async listByTeam(teamId: string): Promise<UserSummary[]> {
    return (await this.repository.listUsersByTeam(teamId)).map(toSummary);
  }
}
