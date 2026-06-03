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

  // Handle unauthorized errors globally. Other API errors are handled by feature UI.
  if (
    status === API_CONSTANT.HTTP_STATUS_CODE.UNAUTHORIZED &&
    originalRequest &&
    !originalRequest._retry &&
    !originalRequest.url?.includes('/auth/refresh')
  ) {
    originalRequest._retry = true
    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    useAppStore.getState().appService?.send({ type: 'TOKEN_EXPIRED' })
  }

  return Promise.reject(error)
}

export function setupInterceptorsTo(axiosInstance: AxiosInstance): AxiosInstance {
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(onResponse, onResponseError)
  return axiosInstance
}
