import type { LinkProps } from '@tanstack/react-router';
import { Link, useMatchRoute } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { Building2, CalendarClock, Handshake, LayoutDashboard, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { HealthIndicator } from '@/health/HealthIndicator';

interface NavItem {
  to: LinkProps['to'];
  label: string;
  icon: LucideIcon;
  /** Module not built yet: the page is a "Coming soon" placeholder (slice 1.1, Q5). */
  soon?: boolean;
}

const crmItems: NavItem[] = [
  { to: '/contacts', label: 'Contacts', icon: Users, soon: true },
  { to: '/companies', label: 'Companies', icon: Building2, soon: true },
  { to: '/deals', label: 'Deals', icon: Handshake, soon: true },
  { to: '/activities', label: 'Activities', icon: CalendarClock, soon: true },
];

function NavLink({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute();
  const { setOpenMobile } = useSidebar();
  // `/` would match every page fuzzily; module pages stay active on their child routes.
  const isActive = Boolean(matchRoute({ to: item.to, fuzzy: item.to !== '/' }));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className="data-active:[&>svg]:text-primary"
      >
        <Link to={item.to} onClick={() => setOpenMobile(false)}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.soon && (
        <SidebarMenuBadge className="rounded-full border px-1.5 text-[10px] font-normal text-muted-foreground">
          Soon
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2.5 px-1 group-data-[collapsible=icon]:px-0">
          <div
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground"
          >
            N
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold">Nova CRM</span>
            <span className="text-xs text-muted-foreground">Nova Agency</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main" className="contents">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavLink item={{ to: '/', label: 'Dashboard', icon: LayoutDashboard }} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>CRM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {crmItems.map((item) => (
                  <NavLink key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <HealthIndicator />
      </SidebarFooter>
    </Sidebar>
  );
}
