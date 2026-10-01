import { seconds } from '../utils/time'

// URL Host theo môi trường (Tự động nhận diện qua __DEV__)
const API_HOST_DEV = 'https://wms-api-uat.aidx.vn'
// const API_HOST_DEV = 'https://bsale-api.aidx.vn'
const API_HOST_PROD = 'https://bsale-api.aidx.vn'

export const API_BASE_URL = API_HOST_PROD

export const API_QUERY_CONFIG = {
  // Request times out after 30s
  TIMEOUT: seconds(30),

  // Max retry attempts before failinga
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
