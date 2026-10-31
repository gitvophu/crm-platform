import { Link, useLocation } from '@tanstack/react-router';

import { NOT_FOUND_TITLE } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';

/** 404 inside the layout, so the navigation stays available. */
export function NotFound() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div className="grid justify-items-start gap-2 py-10">
      <span className="font-mono text-[13px] text-muted-foreground">404</span>
      <h1 className="text-2xl font-semibold tracking-tight">{NOT_FOUND_TITLE}</h1>
      <p className="text-muted-foreground">
        There is no page at <code className="rounded bg-muted px-1.5 font-mono">{pathname}</code>.
        Check the address or go back to the dashboard.
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
