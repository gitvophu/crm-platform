import { Module } from '@nestjs/common';

import { IdentityModule } from '@/modules/identity/index.js';
import { ContactsController } from './contacts.controller.js';
import { ContactsRepository } from './contacts.repository.js';
import { ContactsService } from './contacts.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository],
})
export class ContactsModule {}
