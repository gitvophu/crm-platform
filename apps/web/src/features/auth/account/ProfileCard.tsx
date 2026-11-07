import type { AuthUser } from '@crm/shared';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initials, roleLabel } from '@/features/auth/user-display';

/** Read-only: users and teams are managed by seed for now (spec Phase 1, Q7). */
export function ProfileCard({ user }: { user: AuthUser }) {
  const rows: [string, string][] = [
    ['Name', user.name],
    ['Email', user.email],
    ['Team', user.team.name],
    ['Role', roleLabel[user.role]],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>To change your name or team, ask an admin.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar className="size-11">
          <AvatarFallback className="bg-primary-soft font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          {rows.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
