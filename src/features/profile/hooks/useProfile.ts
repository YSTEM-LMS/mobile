import { useQuery } from '@tanstack/react-query';
import { profileGateway } from '../api/gatewayProvider';

export const profileQueryKey = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: () => profileGateway.getProfile(),
  });
}
