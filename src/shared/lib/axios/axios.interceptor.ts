import { API_CONSTANT } from '@/shared/constants'
import type { useAppStore as UseAppStoreType } from '@/shared/features/app/store/use-app-store'
import { AuthAPI } from '@/shared/features/auth'
import { storage } from '@/shared/lib/storage'
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

// Lazy getter — chỉ resolve lúc runtime, tránh circular import lúc module load
const getAppStore = (): typeof UseAppStoreType =>
  require('@/shared/features/app/store/use-app-store').useAppStore

// ---------------------------------------------------------------------------
// Silent Refresh Queue
// Khi nhiều request đồng thời cùng bị 401, chỉ gọi /refresh 1 lần.
// Các request khác được queue lại và retry sau khi refresh thành công.
// ---------------------------------------------------------------------------
let isRefreshing = false
type QueuedRequest = { resolve: (token: string) => void; reject: (err: unknown) => void }
let failedQueue: QueuedRequest[] = []
let _axiosInstance: AxiosInstance | null = null

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

const REFRESH_TOKEN_KEY = 'auth-refresh-token'

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const accessToken = getAppStore().getState().appService?.getSnapshot().context.accessToken
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
  const isAuthEndpoint = originalRequest?.url?.includes('/auth/refresh')

  // Chỉ xử lý 401 — không phải từ endpoint /refresh chính nó
  if (status !== API_CONSTANT.HTTP_STATUS_CODE.UNAUTHORIZED || !originalRequest || isAuthEndpoint) {
    return Promise.reject(error)
  }

  // Nếu đã retry rồi mà vẫn 401 → refresh thất bại thực sự
  if (originalRequest._retry) {
    getAppStore().getState().appService?.send({ type: 'TOKEN_EXPIRED' })
    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    return Promise.reject(error)
  }

  // Kiểm tra network: không có response.status nghĩa là request không tới server
  // (network error) — nhưng ở đây status = 401 nên server đã trả response → có mạng
  // Vẫn cần check refreshToken có hay không
  const refreshToken = storage.getString(REFRESH_TOKEN_KEY) ?? null
  if (!refreshToken) {
    // Không có refreshToken → logout ngay, không thể silent refresh
    getAppStore().getState().appService?.send({ type: 'TOKEN_EXPIRED' })
    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    return Promise.reject(error)
  }

  // Nếu đang có refresh request khác → queue request này lại
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    }).then((newToken) => {
      originalRequest.headers = new AxiosHeaders({
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      })
      if (_axiosInstance) {
        return _axiosInstance(originalRequest)
      }
      return Promise.reject(new Error('Axios instance not initialized'))
    })
  }

  // Bắt đầu silent refresh
  originalRequest._retry = true
  isRefreshing = true

  try {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await AuthAPI.refresh(refreshToken)

    // Lưu refresh token mới (rotation)
    storage.set(REFRESH_TOKEN_KEY, newRefreshToken)

    // Cập nhật accessToken vào machine context để các request tiếp theo dùng
    const appService = getAppStore().getState().appService
    if (appService) {
      appService.send({ type: 'ACCESS_TOKEN_REFRESHED', accessToken: newAccessToken })
    }

    // Notify các request đang chờ
    processQueue(null, newAccessToken)

    // Retry request gốc với token mới
    originalRequest.headers = new AxiosHeaders({
      ...originalRequest.headers,
      Authorization: `Bearer ${newAccessToken}`,
    })
    if (_axiosInstance) {
      return _axiosInstance(originalRequest)
    }
    return Promise.reject(new Error('Axios instance not initialized'))
  } catch (refreshError: any) {
    // Notify các request đang chờ với lỗi tương ứng
    processQueue(refreshError, null)

    // Nếu là lỗi mạng (không có response từ server), giữ nguyên trạng thái, không logout
    const isNetErr = !refreshError?.response
    if (isNetErr) {
      toast.error('Lỗi kết nối mạng. Không thể làm mới phiên đăng nhập.')
      return Promise.reject(refreshError)
    }

    // Refresh thất bại thực sự (ví dụ: server trả về 400/401/403) → logout
    getAppStore().getState().appService?.send({ type: 'TOKEN_EXPIRED' })
    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    return Promise.reject(refreshError)
  } finally {
    isRefreshing = false
  }
}

export function setupInterceptorsTo(axiosInstance: AxiosInstance): AxiosInstance {
  _axiosInstance = axiosInstance
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(onResponse, onResponseError)
  return axiosInstance
}
