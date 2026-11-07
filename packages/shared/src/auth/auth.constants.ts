export const ROLES = ['admin', 'manager', 'member'] as const;
export type Role = (typeof ROLES)[number];

/** NIST SP 800-63B: length only, no composition rules (slice 1.2). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
