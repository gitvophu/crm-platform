import type { ContactDto } from '@crm/shared';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArchiveDialogProps {
  contact: ContactDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** Archiving asks first (slice 1.3, Q11). */
export function ArchiveDialog({ contact, open, onOpenChange, onConfirm }: ArchiveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {contact.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {contact.type === 'company'
              ? `The company is hidden from lists and can’t be picked for new people. Its ${contact.peopleCount ?? 0} ${contact.peopleCount === 1 ? 'person stays' : 'people stay'} linked and active.`
              : 'The contact is hidden from lists. Records that point to it keep showing the name.'}{' '}
            You can restore it from <span className="font-medium text-foreground">Archived</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
