import { API_QUERY_CONFIG } from '@/shared/constants'
import { days, minutes, seconds } from '@/shared/utils'

export const QUERY_PRESETS = {
  /**
   * DEFAULT: General purpose data (Newsfeed, Product Lists)
   * - Stale immediately (always fetch fresh data in background)
   * - Garbage collected after 5 minutes of inactivity
   */
  DEFAULT: {
    staleTime: 0,
    gcTime: minutes(5),
    retry: API_QUERY_CONFIG.RETRY_COUNT,
    refetchOnWindowFocus: false, // Recommended to disable for mobile apps
  },

  /**
   * STATIC: Rarely changed data (Provinces, Bank Lists, App Config)
   * - Forever fresh (never auto-refetch)
   * - Never garbage collected (stays in memory)
   */
  STATIC: {
    staleTime: Infinity,
    gcTime: Infinity,
    retry: API_QUERY_CONFIG.RETRY_COUNT, // Retry more aggressively for critical static data
  },

  /**
   * REALTIME: Live data (Crypto Prices, Chat, Notifications)
   * - Stale immediately
   * - Auto-refetch (poll) every 10 seconds
   */
  REALTIME: {
    staleTime: 0,
    gcTime: minutes(1),
    refetchInterval: seconds(10),
    retry: 0, // Do not retry on fail, just wait for next poll interval
  },

  /**
   * PERSISTED: Offline-first data (e.g., Social Feed)
   * - Stale immediately (try to fetch new)
   * - Keep in cache/disk for 7 days (so user sees data after app restart)
   */
  OFFLINE_PERSIST: {
    staleTime: 0,
    gcTime: days(7),
    networkMode: 'offlineFirst' as const,
  },
} as const
