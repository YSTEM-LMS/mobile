import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { profileGateway } from '../api/gatewayProvider';
import { useSession } from '@/providers/SessionProvider';
import { ProfileError } from '../api/profile.errors';

export const profileQueryKey = (username: string | undefined) => ['profile', username] as const;

const isSessionExpired = (error: unknown) =>
  error instanceof ProfileError && error.kind === 'session-expired';

export function useProfile() {
  const { session, expiredSession } = useSession();
  const username = session.status === 'authenticated' ? session.user.username : undefined;

  const query = useQuery({
    queryKey: profileQueryKey(username),
    queryFn: ({ signal }) => profileGateway.getProfile(username!, { signal }),
    enabled: Boolean(username),
    retry: (count, error) => !isSessionExpired(error) && count < 1,
  });

  useEffect(() => {
    if (isSessionExpired(query.error)) {
      void expiredSession();
    }
  }, [query.error, expiredSession]);

  return query;
}
