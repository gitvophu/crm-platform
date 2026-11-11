import { type SortValue, sortValues, toSort } from '../http/sort.js';

/** A contact is a company or a person, like `res.partner.is_company` of Odoo (slice 1.4). */
export const CONTACT_TYPES = ['company', 'person'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Longest value of each text field, in characters. */
export const CONTACT_FIELD_MAX = {
  name: 200,
  /** RFC 5321 limit of an address. */
  email: 254,
  phone: 50,
  website: 200,
  jobTitle: 100,
  street: 200,
  city: 100,
  taxId: 20,
  notes: 5000,
} as const;

/**
 * Fields a person takes from their company and that follow it when the company changes
 * (slice 1.4, Q6; Odoo syncs the address and the commercial fields `vat`, `industry_id`).
 */
export const CONTACT_SYNCED_FIELDS = [
  'street',
  'city',
  'countryCode',
  'taxId',
  'industryId',
] as const;
export type ContactSyncedField = (typeof CONTACT_SYNCED_FIELDS)[number];

export const CONTACT_SORTS = ['name', 'email', 'createdAt', 'updatedAt'] as const;
export type ContactSortField = (typeof CONTACT_SORTS)[number];
export type ContactSort = SortValue<ContactSortField>;
/** Every accepted `sort`: a column, or `-column` for descending. */
export const CONTACT_SORT_VALUES = sortValues(CONTACT_SORTS);
/** Recently changed first. */
export const CONTACT_SORT_DEFAULT: ContactSort = toSort('updatedAt', true);

export const CONTACT_SEARCH_MAX_LENGTH = 100;

/** `archived=all`: active and archived contacts together (duplicate email check). */
export const CONTACT_ARCHIVED_ALL = 'all';

/** Most tags on one contact. */
export const CONTACT_TAGS_MAX = 20;
export const CONTACT_TAG_NAME_MAX = 50;
/** Tag colors are indexes into a palette of the web, given in turn (slice 1.4). */
export const CONTACT_TAG_COLOR_COUNT = 10;

/** Most entries of the company picker and of the people of a company page. */
export const CONTACT_PICKER_SIZE = 10;

/** ISO 3166-1 alpha-2. Names come from `Intl.DisplayNames` on the web. */
// prettier-ignore
export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];
/** Nova and most of its clients are in Vietnam. */
export const COUNTRY_DEFAULT: CountryCode = 'VN';
