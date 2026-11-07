import { describe, expect, it } from 'vitest';

import { formatDate, timeAgo } from './format';

const NOW = Date.parse('2026-11-05T12:00:00Z');

describe('timeAgo', () => {
  it.each([
    ['2026-11-05T11:59:40Z', 'just now'],
    ['2026-11-05T10:00:00Z', '2 hours ago'],
    ['2026-11-04T12:00:00Z', 'yesterday'],
    ['2026-10-29T12:00:00Z', 'last week'],
  ])('%s → %s', (iso, text) => {
    expect(timeAgo(iso, NOW)).toBe(text);
  });
});

describe('formatDate', () => {
  it('reads like 12 Oct 2026', () => {
    expect(formatDate('2026-10-12T08:00:00Z')).toBe('12 Oct 2026');
  });
});
