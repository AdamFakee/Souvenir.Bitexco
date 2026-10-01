import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { Employee } from '@/features/app'

/**
 * 2.4 Thông tin nhân viên hiện tại (dùng sau refresh để lấy permissions fresh)
 */
export async function getMe(): Promise<Employee> {
  const axios = AxiosService.getInstance()
  const response = await axios.get<Employee>('/v1/device/auth/me')
  return response.data
}
