import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ name: z.string().trim().min(1, 'Required.') }));

describe('ZodValidationPipe', () => {
  it('returns the parsed value', () => {
    expect(pipe.transform({ name: '  Linh ', extra: true })).toEqual({ name: 'Linh' });
  });

  it('throws 400 with the errors of each field', () => {
    const error = (() => {
      try {
        pipe.transform({ name: ' ' });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: 'Validation failed',
      errors: { name: ['Required.'] },
    });
  });
});
