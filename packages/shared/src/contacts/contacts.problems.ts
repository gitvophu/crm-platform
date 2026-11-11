/** Problem codes of the contacts API. */
export const CONTACT_PROBLEMS = {
  notFound: 'contact.not_found',
  /** The company of a person is not an active company. */
  invalidCompany: 'contact.invalid_company',
  /** A company that still has people cannot become a person. */
  companyHasPeople: 'contact.company_has_people',
  invalidSalesperson: 'contact.invalid_salesperson',
  invalidIndustry: 'contact.invalid_industry',
  invalidTag: 'contact.invalid_tag',
} as const;
