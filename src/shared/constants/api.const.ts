import { seconds } from '../utils/time'

export const API_QUERY_CONFIG = {
  // Request times out after 30s
  TIMEOUT: seconds(30),

  // Max retry attempts before failing
  RETRY_COUNT: 2,
} as const
