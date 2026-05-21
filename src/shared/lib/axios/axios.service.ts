import { API_CONSTANT } from '@/shared/constants'
import { AxiosInstance, AxiosRequestConfig, create } from 'axios'
import { setupInterceptorsTo } from './axios.interceptor'

export class AxiosService {
  private static instance: AxiosService
  private axiosInstance: AxiosInstance
  readonly baseUrl: string = 'https://api-wms-dev.aidx.vn'

  constructor() {
    this.axiosInstance = setupInterceptorsTo(
      create({
        baseURL: this.baseUrl,
        timeout: API_CONSTANT.TIME_DEFAULT.TIMEOUT_REQUEST * 1000,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )
  }

  public static getInstance(): AxiosService {
    if (!AxiosService.instance) {
      AxiosService.instance = new AxiosService()
    }
    return AxiosService.instance
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }

  get<T>(path: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.get<T>(path, config)
  }

  post<T>(path: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.post<T>(path, data, config)
  }

  put<T>(path: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.put<T>(path, data, config)
  }

  delete<T>(path: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.delete<T>(path, config)
  }

  patch<T>(path: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.patch<T>(path, data, config)
  }
}
