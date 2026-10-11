import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/feedback/InlineError';

export default function ErrorScreen({
  message,
  restoreSession,
  signOut,
}: {
  message: string;
  restoreSession: () => Promise<void>;
  signOut: () => Promise<void>;
}) {
  return (
    <>
      <InlineError message={message} />
      <Button onPress={restoreSession}>Retry</Button>
      <Button onPress={signOut}>Sign Out</Button>
    </>
  );
}
