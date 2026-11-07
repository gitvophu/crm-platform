import { z } from 'zod';

/** `owner=me`: the records of the caller. Any list with an owner filter accepts it. */
export const OWNER_ME = 'me';

/** `true`/`false` from a query string, or already a boolean (web route search). */
export const booleanParam = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);
