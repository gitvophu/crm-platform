import type { HttpStatus } from '@nestjs/common';

/**
 * An error the API answers on purpose, with a stable `code` (slice 1.3, Q5): business errors use
 * `<module>.<error>` (`contact.email_taken`), the rest the generic codes of `@crm/shared`.
 * Turned into `application/problem+json` by ProblemDetailsFilter.
 */
export class AppProblem extends Error {
  constructor(
    readonly status: HttpStatus,
    readonly code: string,
    /** Shown to the user as is: one sentence, no internals. */
    readonly detail: string,
    /** Messages per field, for validation and field conflicts. */
    readonly errors?: Record<string, string[]>,
  ) {
    super(detail);
    this.name = 'AppProblem';
  }
}
