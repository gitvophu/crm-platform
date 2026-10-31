import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

interface ComingSoonProps {
  title: string;
  /** Completes "Manage …", e.g. "people at your client companies". */
  what: string;
  features: string[];
}

/** Placeholder for a module built in a later slice; that slice replaces the page (slice 1.1, Q5). */
export function ComingSoon({ title, what, features }: ComingSoonProps) {
  return (
    <div className="grid max-w-5xl gap-5">
      <PageHeader title={title} description={`Manage ${what}.`} />
      <div className="grid justify-items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
        <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <Clock className="size-[22px]" aria-hidden />
        </div>
        <h2 className="mt-1 text-base font-semibold">{title} is coming soon</h2>
        <p className="max-w-[44ch] text-muted-foreground">
          This part of Nova CRM is being built. Here is what it will do:
        </p>
        <ul className="mt-2 grid gap-1 text-[13px] text-muted-foreground">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
