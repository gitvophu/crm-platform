import {
  type ContactDto,
  contactListQuery,
  type ContactListQuery,
  createContactInput,
  type Page,
  updateContactInput,
} from '@crm/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { z } from 'zod';

import { CurrentUser, type SessionUser } from '@/modules/identity/index.js';
import { ZodValidationPipe } from '@/validation/zod-validation.pipe.js';
import { ContactsService } from './contacts.service.js';

/**
 * HTTP only: parse the input, call the service, return its DTO. Rules and access live in the
 * service (convention from slice 1.3).
 */
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(contactListQuery)) query: ContactListQuery,
  ): Promise<Page<ContactDto>> {
    return this.contacts.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ContactDto> {
    return this.contacts.get(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createContactInput)) body: z.output<typeof createContactInput>,
  ): Promise<ContactDto> {
    return this.contacts.create(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContactInput)) body: z.output<typeof updateContactInput>,
  ): Promise<ContactDto> {
    return this.contacts.update(user, id, body);
  }

  /** An action, not `DELETE`: nothing is deleted, and it can be undone (slice 1.3, Q3). */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ContactDto> {
    return this.contacts.archive(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ContactDto> {
    return this.contacts.restore(user, id);
  }
}
