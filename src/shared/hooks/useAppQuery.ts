import { getRetryDelay, shouldRetry } from '@/shared/utils'
import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query'

/**
 * A custom wrapper around useQuery
 */
export function useAppQuery<TData = unknown, TError = any>(
  options: UseQueryOptions<TData, TError, TData, QueryKey>,
) {
  return useQuery({
    retry: shouldRetry,
    retryDelay: getRetryDelay,
    ...options,
  })
}
