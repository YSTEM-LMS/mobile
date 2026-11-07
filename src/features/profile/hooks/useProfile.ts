import { useQuery } from '@tanstack/react-query';
import { profileGateway } from '../api/gatewayProvider';
import { useSession } from '@/providers/SessionProvider';
import { ProfileError } from '../api/profile.errors';
import { useEffect } from 'react';

export const profileQueryKey = (username: string | undefined) =>
  ['profile', username] as const;

export function useProfile() {
  const { session, expiredSession } = useSession();
  const username =
    session.status === 'authenticated' ? session.user.username : undefined;

  const query = useQuery({
    queryKey: profileQueryKey(username),
    queryFn: ({ signal }) => profileGateway.getProfile(username!, { signal }),
    enabled: Boolean(username),
    // no retry option, the QueryClient's default is applied
  });

  useEffect(() => {
    if (
      query.error instanceof ProfileError &&
      query.error.kind === 'session-expired'
    ) {
      void expiredSession();
    }
  }, [query.error, expiredSession]);

  return query;
}
