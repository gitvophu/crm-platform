import { Link } from '@tanstack/react-router';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from './use-current-user';
import { useLogout } from './use-logout';
import { initials, roleLabel } from './user-display';

/** Header, right side: who is signed in, the account page and sign out (slice 1.2, Q12). */
export function UserMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="ml-auto h-9 gap-2 rounded-full pr-2.5 pl-1">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.name}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="font-semibold text-primary">{user.name}</span>
          <span className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
            {user.email}
          </span>
          <span className="mt-1.5 flex gap-1.5">
            <Badge variant="outline">{user.team.name}</Badge>
            <Badge variant="outline">{roleLabel[user.role]}</Badge>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserRound />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
