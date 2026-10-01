import { AxiosService } from '@/shared/lib/axios/axios.service'
import { formatDate } from '@/shared/utils'
import { OrderApiError } from './order-api-error'

export interface GetReconciliationParams {
  partnerId?: string | null
  affiliateId?: string | null
  dateFrom: Date | string
  dateTo: Date | string
}

export interface ReconciliationResult {
  ownerCode: string
  totalOrdersCount: number
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  dateFrom: string
  dateTo: string
}

/**
 * Lấy thông tin đối soát theo đối tác hoặc cộng tác viên.
 */
export async function getReconciliation(
  params: GetReconciliationParams,
): Promise<ReconciliationResult> {
  const { partnerId, affiliateId, dateFrom, dateTo } = params

  const urlParams = new URLSearchParams()
  if (partnerId) urlParams.append('partnerId', partnerId)
  if (affiliateId) urlParams.append('affiliateId', affiliateId)

  const formattedDateFrom =
    dateFrom instanceof Date ? formatDate(dateFrom, 'YYYY-MM-DD') : String(dateFrom)
  const formattedDateTo = dateTo instanceof Date ? formatDate(dateTo, 'YYYY-MM-DD') : String(dateTo)

  urlParams.append('dateFrom', formattedDateFrom)
  urlParams.append('dateTo', formattedDateTo)

  try {
    const response = await AxiosService.getInstance().get<ReconciliationResult>(
      '/v1/pos/reconciliation',
      { params: urlParams },
    )
    return response.data
  } catch (error) {
    const typedError = error as {
      response?: { status?: number; data?: { error?: string; traceId?: string } }
      message?: string
    }
    const status = typedError?.response?.status
    const data = typedError?.response?.data
    const code = typeof data?.error === 'string' ? data.error : undefined
    const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined
    throw new OrderApiError(code || typedError?.message || 'order.reconciliation_failed', {
      code,
      status,
      traceId,
    })
  }
}
