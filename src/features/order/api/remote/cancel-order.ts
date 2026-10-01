import { AxiosService } from '@/shared/lib/axios/axios.service'

export interface CancelOrderParams {
  orderId: string
  shiftId: string
  staffId: string
  reason?: string
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface CancelOrderResult {
  orderId: string
  orderCode?: string
  status: 'CANCELLED'
  cancelledAt?: string
}

/**
 * Hủy đơn hàng (Remote API)
 */
export async function cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
  const { orderId, shiftId, staffId, reason, managerAuth } = params

  const res = await AxiosService.getInstance().post<CancelOrderResult>(
    `/v1/pos/orders/${orderId}/cancel`,
    {
      shiftId,
      staffId,
      reason,
      ...(managerAuth
        ? {
            managerAuth: {
              employeeCode: managerAuth.employeeCode,
              pin: managerAuth.pin,
            },
          }
        : {}),
    },
  )
  return res.data
}
