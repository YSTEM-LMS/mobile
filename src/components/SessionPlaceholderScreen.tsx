import type { PropsWithChildren } from 'react';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useSession } from '@/providers/SessionProvider';

type SessionPlaceholderScreenProps = PropsWithChildren<{
  title: string;
}>;

export function SessionPlaceholderScreen({
  children,
  title,
}: SessionPlaceholderScreenProps) {
  const { session } = useSession();

  const description =
    session.status === 'authenticated'
      ? `Signed in as ${session.user.displayName} (${session.user.role}).`
      : `Session status: ${session.status}.`;

  return (
    <PlaceholderScreen description={description} title={title}>
      {children}
    </PlaceholderScreen>
  );
}
