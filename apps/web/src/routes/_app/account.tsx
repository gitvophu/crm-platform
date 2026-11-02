import { createFileRoute } from '@tanstack/react-router';

import { ChangePasswordForm } from '@/auth/ChangePasswordForm';
import { useCurrentUser } from '@/auth/me-query';
import { ProfileCard } from '@/auth/ProfileCard';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_app/account')({
  staticData: { title: 'Account' },
  component: AccountPage,
});

function AccountPage() {
  const user = useCurrentUser();

  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader title="Account" description="Your profile and password." />
      {user && <ProfileCard user={user} />}
      <ChangePasswordForm />
    </div>
  );
}
