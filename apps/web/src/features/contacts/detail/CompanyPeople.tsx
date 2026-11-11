import type { ContactDto } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { COMPANY_PEOPLE_SHOWN, contactQueries } from '@/features/contacts/contacts-api';
import { ContactAvatar } from '@/features/contacts/ContactAvatar';

/** The people of a company, with "Add person" (slice 1.4, Q8). */
export function CompanyPeople({ company }: { company: ContactDto }) {
  const people = useQuery(contactQueries.people(company.id));
  const total = people.data?.total ?? company.peopleCount ?? 0;

  let body: React.ReactNode;
  if (people.isPending) {
    body = (
      <div aria-busy="true" aria-label="Loading people" className="grid gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  } else if (people.isError) {
    body = <ErrorState what="people" error={people.error} onRetry={() => void people.refetch()} />;
  } else if (people.data.total === 0) {
    body = <p className="text-muted-foreground">No people at {company.name} yet.</p>;
  } else {
    body = (
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.data.items.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ContactAvatar contact={person} />
                    <Link
                      to="/contacts/$id"
                      params={{ id: person.id }}
                      className="font-medium hover:underline"
                    >
                      {person.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>{person.jobTitle ?? '—'}</TableCell>
                <TableCell className="hidden sm:table-cell">{person.email ?? '—'}</TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                  {person.phone ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <Card className="lg:col-start-1">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>
          People <span className="font-normal text-muted-foreground tabular-nums">{total}</span>
        </CardTitle>
        {!company.archivedAt && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/contacts/new" search={{ companyId: company.id }}>
              <Plus />
              Add person
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {body}
        <div className="flex flex-wrap gap-4 text-sm">
          {total > COMPANY_PEOPLE_SHOWN && (
            <Link
              to="/contacts"
              search={{ companyId: company.id }}
              className="text-primary hover:underline"
            >
              See all {total} people
            </Link>
          )}
          <Link
            to="/contacts"
            search={{ companyId: company.id, archived: true }}
            className="text-primary hover:underline"
          >
            Show archived people
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
