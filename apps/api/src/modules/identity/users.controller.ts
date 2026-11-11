import type { UserSummary } from '@crm/shared';
import { Controller, Get } from '@nestjs/common';

import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Every user, for salesperson pickers and filters (slice 1.4: no team scope anymore). */
  @Get()
  list(): Promise<UserSummary[]> {
    return this.users.listAll();
  }
}
