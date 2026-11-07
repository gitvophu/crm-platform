import type { Role } from '@crm/shared';

/** "Linh Tran" → "LT". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};
