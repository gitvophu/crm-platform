import { Link, useMatches } from '@tanstack/react-router';
import { Fragment } from 'react';

import { UserMenu } from '@/features/auth';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const NOT_FOUND_TITLE = 'Page not found';

interface Crumb {
  label: string;
  path: string;
}

/**
 * One crumb per route that names itself: `staticData.title`, or `{ crumb }` returned by its
 * loader for names that come from data ("Hana Vo"). A single crumb reads "Nova CRM / Dashboard";
 * deeper pages drop the app name: "Contacts / Hana Vo / Edit".
 */
function useCrumbs(): Crumb[] {
  return useMatches({
    select: (matches) =>
      matches.flatMap((match) => {
        const label =
          (match.loaderData as { crumb?: string } | undefined)?.crumb ?? match.staticData.title;
        return label ? [{ label, path: match.pathname }] : [];
      }),
    structuralSharing: true,
  });
}

/** Sidebar toggle, breadcrumb, and the user menu on the right. */
export function AppHeader() {
  const found = useCrumbs();
  const crumbs: (Crumb | { label: string; path?: undefined })[] =
    found.length > 1 ? found : [{ label: 'Nova CRM' }, found[0] ?? { label: NOT_FOUND_TITLE }];

  return (
    // SidebarInset is the <main>; the header still has to be the page's banner landmark.
    <header role="banner" className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <Fragment key={`${index}-${crumb.label}`}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className="min-w-0">
                  {last ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : crumb.path ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.path}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    crumb.label
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <UserMenu />
    </header>
  );
}
