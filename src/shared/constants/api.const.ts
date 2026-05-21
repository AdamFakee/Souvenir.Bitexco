import { seconds } from '../utils/time'

export const API_QUERY_CONFIG = {
  // Request times out after 30s
  TIMEOUT: seconds(30),

  // Max retry attempts before failing
  RETRY_COUNT: 2,
} as const

export const API_CONSTANT = {
  TIME_DEFAULT: {
    TIMEOUT_REQUEST: 30, // seconds
    TIME_LOGIN_DELAY: 15, // seconds
  },
  HTTP_STATUS_CODE: {
    SUCCESS: 200,
    CREATED: 201,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
}
