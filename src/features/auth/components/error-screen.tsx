import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/feedback/InlineError';
import { useState } from 'react';

export default function ErrorScreen({
  message,
  restoreSession,
  signOut,
}: {
  message: string;
  restoreSession: () => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  const signOutPressed = async () => {
    setSigningOut(true);
    setError('');

    try {
      await signOut();
    } catch {
      setSigningOut(false);

      setError('Unable to sign out. Please try again.');
    }
  };

  return (
    <>
      <InlineError message={message} />
      <Button onPress={restoreSession}>Retry</Button>
      <Button
        onPress={signOutPressed}
        disabled={signingOut}
        loading={signingOut}
        loadingLabel="Signing out"
      >
        Sign Out
      </Button>

      {error && <InlineError message={error} />}
    </>
  );
}
