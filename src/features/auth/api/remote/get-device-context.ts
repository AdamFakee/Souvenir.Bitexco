import { AxiosService } from '@/shared/lib/axios/axios.service'

export interface DeviceContextResponse {
  deviceId: string
  deviceCode: string
  deviceName: string
  warehouseId: string
  isActive: boolean
}

/**
 * 2.5 Lấy thông tin ngữ cảnh thiết bị — kiểm tra isActive
 */
export async function getDeviceContext(): Promise<DeviceContextResponse> {
  const axios = AxiosService.getInstance()
  const response = await axios.get<DeviceContextResponse>('/v1/pos/device-context')
  return response.data
}
