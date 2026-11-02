import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps extends ComponentProps<'input'> {
  id: string;
  label: string;
  /** Shown under the input in place of the hint, and marks the input invalid. */
  error?: string;
  hint?: string;
}

/** Label + input + error or hint, wired for screen readers. */
export function FormField({ id, label, error, hint, ...input }: FormFieldProps) {
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
        {...input}
      />
      {note && (
        <p
          id={noteId}
          className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        >
          {note}
        </p>
      )}
    </div>
  );
}
