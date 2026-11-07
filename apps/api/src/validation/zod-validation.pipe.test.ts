import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppProblem } from '@/errors/app-problem.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ name: z.string().trim().min(1, 'Required.') }));

describe('ZodValidationPipe', () => {
  it('returns the parsed value', () => {
    expect(pipe.transform({ name: '  Linh ', extra: true })).toEqual({ name: 'Linh' });
  });

  it('throws validation_failed with the errors of each field', () => {
    let error: unknown;
    try {
      pipe.transform({ name: ' ' });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(AppProblem);
    expect(error).toMatchObject({
      status: 400,
      code: 'validation_failed',
      errors: { name: ['Required.'] },
    });
  });
});
