import {
  type ContactDto,
  contactListQuery,
  type ContactListQuery,
  type ContactTagDto,
  contactTagListQuery,
  type ContactTagListQuery,
  createContactInput,
  createContactTagInput,
  type IndustryDto,
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
 * HTTP only: parse the input, call the service, return its DTO. Rules live in the service
 * (convention from slice 1.3). Fixed paths (`industries`, `tags`) come before `:id`.
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

  @Get('industries')
  listIndustries(): Promise<IndustryDto[]> {
    return this.contacts.listIndustries();
  }

  @Get('tags')
  listTags(
    @Query(new ZodValidationPipe(contactTagListQuery)) query: ContactTagListQuery,
  ): Promise<ContactTagDto[]> {
    return this.contacts.listTags(query);
  }

  /** 200 either way: the new tag, or the existing one of that name. */
  @Post('tags')
  @HttpCode(HttpStatus.OK)
  createTag(
    @Body(new ZodValidationPipe(createContactTagInput))
    body: z.output<typeof createContactTagInput>,
  ): Promise<ContactTagDto> {
    return this.contacts.createTag(body);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ContactDto> {
    return this.contacts.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createContactInput)) body: z.output<typeof createContactInput>,
  ): Promise<ContactDto> {
    return this.contacts.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContactInput)) body: z.output<typeof updateContactInput>,
  ): Promise<ContactDto> {
    return this.contacts.update(id, body);
  }

  /** An action, not `DELETE`: nothing is deleted, and it can be undone (slice 1.3, Q3). */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string): Promise<ContactDto> {
    return this.contacts.archive(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id') id: string): Promise<ContactDto> {
    return this.contacts.restore(id);
  }
}
