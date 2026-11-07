import { userListQuery, type UserListQuery, type UserSummary } from '@crm/shared';
import { Controller, Get, Query } from '@nestjs/common';

import { ZodValidationPipe } from '@/validation/zod-validation.pipe.js';
import { CurrentUser } from './auth.decorators.js';
import type { SessionUser } from './auth.types.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Members of the caller's team (owner pickers, filters). Admins may ask for another team. */
  @Get()
  list(
    @CurrentUser() caller: SessionUser,
    @Query(new ZodValidationPipe(userListQuery)) query: UserListQuery,
  ): Promise<UserSummary[]> {
    const teamId = caller.role === 'admin' && query.teamId ? query.teamId : caller.teamId;
    return this.users.listByTeam(teamId);
  }
}
