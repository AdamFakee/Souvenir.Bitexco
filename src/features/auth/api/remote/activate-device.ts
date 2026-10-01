import type { DeviceInfo } from '@/features/app'
import { AxiosService } from '@/shared/lib/axios/axios.service'

export interface DeviceActivationRequest {
  deviceCode: string
  activationToken: string
}

/**
 * 1. Kích hoạt thiết bị (1 lần duy nhất)
 * Anonymous — không cần token
 */
export async function activateDevice(data: DeviceActivationRequest): Promise<DeviceInfo> {
  const axios = AxiosService.getInstance()
  const response = await axios.post<DeviceInfo>('/v1/pos-devices/activate', data)
  return response.data
}
