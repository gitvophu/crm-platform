const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 hours ago", "yesterday", "last week". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/** "12 Oct 2026". */
export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}
