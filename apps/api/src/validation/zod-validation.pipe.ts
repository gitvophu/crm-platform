import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/**
 * Validates and parses an input with a zod schema from `@crm/shared` (slice 1.2, Q4):
 * `@Body(new ZodValidationPipe(loginInput)) body: z.output<typeof loginInput>`.
 * The 400 body is Nest's default plus `errors` per field; slice 1.3 settles the error format.
 */
@Injectable()
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        errors: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}
