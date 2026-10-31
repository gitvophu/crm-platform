import { describe, expect, it } from 'vitest';

import { resolveRequestId } from './request-id.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it.each(['abc-123', 'trace_01.a', 'a'.repeat(128)])('reuses a valid header: %s', (id) => {
    expect(resolveRequestId(id)).toBe(id);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too long', 'a'.repeat(129)],
    ['with a space', 'abc 123'],
    ['with a quote', 'abc"123'],
    ['with a newline', 'abc\n123'],
    ['repeated header', ['abc', 'def']],
  ])('generates a UUID when the header is %s', (_case, header) => {
    expect(resolveRequestId(header)).toMatch(UUID);
  });
});
