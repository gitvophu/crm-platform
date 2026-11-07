/** `sort=<field>` sorts ascending, `sort=-<field>` descending (slice 1.3, Q6). */
export const SORT_DESC_PREFIX = '-';
export type SortValue<F extends string> = F | `${typeof SORT_DESC_PREFIX}${F}`;

export const toSort = <F extends string>(field: F, descending: boolean): SortValue<F> =>
  descending ? `${SORT_DESC_PREFIX}${field}` : field;

export function parseSort<F extends string>(sort: SortValue<F>): { field: F; descending: boolean } {
  return sort.startsWith(SORT_DESC_PREFIX)
    ? { field: sort.slice(SORT_DESC_PREFIX.length) as F, descending: true }
    : { field: sort as F, descending: false };
}

/** Every accepted `sort` of a list: each field, ascending and descending (for `z.enum`). */
export const sortValues = <F extends string>(fields: readonly F[]) =>
  fields.flatMap((field) => [toSort(field, false), toSort(field, true)]) as [
    SortValue<F>,
    ...SortValue<F>[],
  ];
