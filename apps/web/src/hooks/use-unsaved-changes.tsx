import { useBlocker } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

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

/**
 * Asks before leaving a form with unsaved changes (slice 1.3, Q9): a dialog for in-app navigation
 * (menu, Back, breadcrumb), the browser's own prompt for reload or closing the tab. Call
 * `allowLeave()` right before navigating away after a successful save.
 */
export function useUnsavedChanges(dirty: boolean) {
  const block = useRef(false);
  const allowed = useRef(false);
  useEffect(() => {
    block.current = dirty && !allowed.current;
  }, [dirty]);

  const blocker = useBlocker({
    shouldBlockFn: () => block.current,
    enableBeforeUnload: () => block.current,
    withResolver: true,
  });

  const dialog = (
    <AlertDialog open={blocker.status === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to this contact. If you leave now, they are lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    dialog,
    allowLeave: () => {
      allowed.current = true;
      block.current = false;
    },
  };
}
