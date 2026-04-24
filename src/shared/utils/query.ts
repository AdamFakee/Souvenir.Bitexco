import { API_QUERY_CONFIG } from '../constants/api.const'

/**
 * Determines whether a query should be retried based on its failure count and error status.
 *
 * @param failureCount The number of times the query has previously failed.
 * @param error The error object thrown by the API fetching library (e.g., Axios, Ky).
 * @returns `true` if the query should be retried, `false` to abort retrying immediately.
 */
export const shouldRetry = (failureCount: number, error: any): boolean => {
  // 1. Cap retry count: Stop retrying if we've reached the maximum allowed attempts.
  if (failureCount >= API_QUERY_CONFIG.RETRY_COUNT) return false

  // 2. Client Errors (4xx - 400, 401, 403, 404...):
  // These indicate a bad request from the client (e.g., invalid data, unauthenticated, resource missing).
  // Retrying identical requests will yield the same error, so we abort immediately to avoid wasting resources.
  if (error?.status >= 400 && error?.status < 500) {
    return false
  }

  // 3. Server Errors (5xx) & Network Issues (Offline, Timeout):
  // These are typically transient errors caused by temporary server overload or unstable network connections.
  // There is a good chance the request will succeed if retried after a short delay.
  return true
}

/**
 * Calculate the delay before the next retry attempt using Exponential Backoff with Jitter.
 *
 * @param attemptIndex The current retry attempt number (0-indexed).
 * @returns The delay in milliseconds before the next retry.
 */
export const getRetryDelay = (attemptIndex: number) => {
  // 1. Exponential Backoff: Double the wait time for each subsequent attempt (1s -> 2s -> 4s -> 8s...).
  // Cap the maximum delay at 30 seconds (30000ms) to ensure the user doesn't wait indefinitely.
  const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 30000)

  // 2. Jitter: Add a random element of noise (between 0% and 20% of the baseDelay).
  // Purpose: Prevents the "Thundering Herd" problem. If the server recovers from an outage,
  // jitter ensures that numerous clients don't all retry at the exact same millisecond,
  // which could overwhelm and crash the server again.
  const jitter = baseDelay * 0.2 * Math.random()

  // Total delay = calculated base delay + randomized jitter
  return baseDelay + jitter
}
