import { useQuery } from '@tanstack/react-query';
import { profileGateway } from '../api/gatewayProvider';
import { useSession } from '@/providers/SessionProvider';
import { AppError } from '@/services/api/apiError';

export const profileQueryKey = (username: string | undefined) => ['profile', username] as const;

export function useProfile() {
  const { session } = useSession();
  const username = session.status === 'authenticated' ? session.user.username : undefined;

  const query = useQuery({
    queryKey: profileQueryKey(username),
    queryFn: ({ signal }) => profileGateway.getProfile(username!, { signal }),
    enabled: Boolean(username),
    // If the session is expired, don't retry
    retry: (count, error) => 
      !(error instanceof AppError && error.code === 'SESSION_EXPIRED') && count < 1,
  });

  return query;
}
