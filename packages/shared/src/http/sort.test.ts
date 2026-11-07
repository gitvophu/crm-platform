import { describe, expect, it } from 'vitest';

import { parseSort, sortValues, toSort } from './sort.js';

describe('sort', () => {
  it('writes and reads both directions', () => {
    expect(toSort('name', false)).toBe('name');
    expect(toSort('name', true)).toBe('-name');
    expect(parseSort('name')).toEqual({ field: 'name', descending: false });
    expect(parseSort('-updatedAt')).toEqual({ field: 'updatedAt', descending: true });
  });

  it('lists every accepted value', () => {
    expect(sortValues(['name', 'stage'])).toEqual(['name', '-name', 'stage', '-stage']);
  });
});
