import { AxiosService } from '@/shared/lib/axios/axios.service'
import { RefundReceiptData } from '../../types'

export interface RefundOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface RefundOrderResult {
  returnId?: string
  returnCode?: string
  orderId: string
  orderCode?: string
  refundAmount: number
  status?: 'COMPLETED' | 'REFUND_PROCESSING' | 'FAILED'
  receipt?: RefundReceiptData
}

/**
 * Trả hàng full-order online (atomic).
 */
export async function refundOrder(params: RefundOrderParams): Promise<RefundOrderResult> {
  const { orderId, idempotencyKey, reason, shiftId, staffId, managerAuth } = params

  const response = await AxiosService.getInstance().post<RefundOrderResult>(
    `/v1/pos/orders/${orderId}/refund`,
    {
      idempotencyKey,
      reason,
      shiftId,
      staffId,
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

  return response.data
}
