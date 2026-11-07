import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { StatusDot } from './StatusDot';
import { useHealth } from './use-health';

/** Sidebar footer: one line of system status; only the dot (with a tooltip) when collapsed. */
export function HealthIndicator() {
  const health = useHealth();
  const summary = health.state === 'pending' ? 'Checking status…' : health.summary;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="sm"
          tooltip={summary}
          className="cursor-default text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
        >
          {/* Focusable, so keyboard users can open the tooltip when the sidebar is collapsed. */}
          <div role="status" tabIndex={0}>
            <StatusDot level={health.state === 'pending' ? 'pending' : health.level} />
            <span>{summary}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
