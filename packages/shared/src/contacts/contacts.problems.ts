/** Problem codes of the contacts API. */
export const CONTACT_PROBLEMS = {
  notFound: 'contact.not_found',
  forbidden: 'contact.forbidden',
  invalidOwner: 'contact.invalid_owner',
  emailTaken: 'contact.email_taken',
} as const;
