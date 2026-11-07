import { Button } from '@/components/ui/button';

interface ContactsPagerProps {
  page: number;
  pageSize: number;
  total: number;
  archived: boolean;
  onPage: (page: number) => void;
}

export function ContactsPager({ page, pageSize, total, archived, onPage }: ContactsPagerProps) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const noun = archived ? 'archived contacts' : 'contacts';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {first}–{last} of {total} {noun}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={last >= total}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
