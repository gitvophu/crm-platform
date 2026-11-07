import type { ContactDto } from './contacts.dto.js';

/** Full name for display: first and last name, the last one may be empty. */
export function contactName(contact: Pick<ContactDto, 'firstName' | 'lastName'>): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
}
