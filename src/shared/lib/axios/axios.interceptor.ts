import { API_CONSTANT } from '@/shared/constants'
import { useAppStore } from '@/shared/features/app'
import { toast } from '@/shared/store'
import {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const accessToken = useAppStore.getState().appService?.getSnapshot().context.accessToken
  config.headers = new AxiosHeaders({
    ...config.headers,
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
    'Content-Type': 'application/json',
  })

  return config
}

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error)
}

const onResponse = (response: AxiosResponse): AxiosResponse => {
  return response
}

const onResponseError = async (error: AxiosError): Promise<any> => {
  const originalRequest = error.config as CustomAxiosRequestConfig
  const status = error.response?.status

  // Handle Refresh Token
  if (
    status === API_CONSTANT.HTTP_STATUS_CODE.UNAUTHORIZED &&
    originalRequest &&
    !originalRequest._retry &&
    !originalRequest.url?.includes('/auth/refresh-token')
  ) {
    originalRequest._retry = true

    try {
      // const { tokens, setTokens, logout } = useAuthStore.getState()

      // if (tokens?.refreshToken) {
      // const response = await AuthApi.refreshToken({ refreshToken: tokens.refreshToken })

      // if (response.success && response.tokens) {
      // setTokens(response.tokens)

      // Update authorization header with new token
      // originalRequest.headers.Authorization = `Bearer ${response.tokens.accessToken}`

      // Retry original request
      // return axios(originalRequest)
      // } else {
      // Refresh failed
      // logout()
      // return Promise.reject(error)
      // }
      // } else {
      // No refresh token available
      // logout()
      // return Promise.reject(error)
      // }
      return Promise.reject(error)
    } catch (refreshError) {
      // Refresh token API failed
      // useAuthStore.getState().logout()
      return Promise.reject(refreshError)
    }

    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    useAppStore.getState().appService?.send({ type: 'TOKEN_EXPIRED' })
  }

  // Handle other errors (Show Toast)
  if (status !== API_CONSTANT.HTTP_STATUS_CODE.UNAUTHORIZED) {
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    toast.error(message)
  }

  return Promise.reject(error)
}

export function setupInterceptorsTo(axiosInstance: AxiosInstance): AxiosInstance {
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(onResponse, onResponseError)
  return axiosInstance
}
