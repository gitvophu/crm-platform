import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder rows while the first page loads. */
export function ContactsTableSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading contacts"
      className="grid gap-4 rounded-lg border p-4"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="grid w-44 gap-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="ml-6 h-3 w-16" />
          <Skeleton className="ml-6 hidden h-3 w-28 sm:block" />
          <Skeleton className="ml-6 hidden h-3 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
