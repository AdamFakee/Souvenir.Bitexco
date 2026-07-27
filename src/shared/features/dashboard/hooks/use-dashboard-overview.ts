import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DashboardRemoteAPI } from '../api/remote/dashboard.remote.api'

export function useDashboardOverview(shiftId?: string, staffId?: string | null) {
  const query = useQuery({
    queryKey: ['dashboard', 'overview', shiftId, staffId],
    queryFn: () => DashboardRemoteAPI.fetchDashboardOverview(shiftId!, staffId),
    staleTime: 5 * 60 * 1000,
    enabled: !!shiftId,
    placeholderData: keepPreviousData,
    retry: 1,
    // Không kẹt shimmer nếu API treo — fail sau 15s
    networkMode: 'always',
  })

  return {
    overview: query.data ?? null,
    isLoading: !!shiftId && query.isLoading && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
