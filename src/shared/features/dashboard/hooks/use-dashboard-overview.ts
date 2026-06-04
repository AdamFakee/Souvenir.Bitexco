import { useQuery } from '@tanstack/react-query'
import { DashboardRemoteAPI } from '../api/remote/dashboard.remote.api'

export function useDashboardOverview(shiftId?: string) {
  const query = useQuery({
    queryKey: ['dashboard', 'overview', shiftId],
    queryFn: () => DashboardRemoteAPI.fetchDashboardOverview(shiftId!),
    staleTime: 5 * 60 * 1000, // 5 minutes cache stale time
    enabled: !!shiftId, // Require shiftId to run query
  })

  return {
    overview: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
