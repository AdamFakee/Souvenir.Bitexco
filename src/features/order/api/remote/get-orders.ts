import { AxiosService } from '@/shared/lib/axios/axios.service'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import {
  Affiliate,
  IOrder,
  OrderFulfillmentStatus,
  OrderInvoiceStatus,
  OrderPaymentStatus,
  OrderReturnStatus,
  OrderState,
  OrderStatusType,
  Partner,
} from '@/shared/types'
import { IBaseResponse, PagedResponse } from '@/shared/types/api'
import { endOfDay, startOfDay } from '@/shared/utils'
import { RefundReceiptData } from '../../types'
import { checkCanExchange, checkCanReturn } from '../../utils'
import { OrderApiError } from './order-api-error'

interface OrderListApiItem {
  id: string
  code?: string | null
  shiftId: string
  staffId: string
  staffName?: string | null
  status: OrderStatusType
  state?: OrderState | null
  paymentStatus?: OrderPaymentStatus | null
  fulfillmentStatus?: OrderFulfillmentStatus | null
  invoiceStatus?: OrderInvoiceStatus | null
  returnStatus?: OrderReturnStatus | null
  subtotal: number
  discount: number
  voucherCode?: string | null
  voucherDiscount: number
  total: number
  totalTax: number
  paidTotal?: number
  note?: string | null
  refundReason?: string | null
  originalOrderId?: string | null
  originalOrderCode?: string | null
  customerTaxInfo: TaxInfo | null
  itemsSnapshot?: ItemSnapshot[] | null
  paymentsSnapshot?: PaymentSnapshot[] | null
  isDeleted: boolean
  canReturn?: boolean
  canExchange?: boolean
  createdAt: string | number | Date
  updatedAt: string | number | Date
  totalRefunded?: number
  refunds?: any[]
  refund?: RefundReceiptData | null
  agentType?: 'collaborator' | 'agent' | 'retail'
  affiliateId?: string | null
  partnerId?: string | null
  affiliate?: Affiliate | null
  partner?: Partner | null
}

export interface GetRemoteOrdersParams {
  status?: any
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
  page?: number
  limit?: number
  /** Mã nhân viên để lọc đơn hàng. null hoặc undefined = tất cả nhân viên */
  staffId?: string | null
  /** ID của ca làm việc để lọc đơn hàng */
  shiftId?: string | null
  /** ID của HDV / CTV để lọc đơn hàng */
  affiliateId?: string | null
  /** ID của Đối tác để lọc đơn hàng */
  partnerId?: string | null
  /** Loại đối tượng: collaborator hoặc agent để lọc tất cả CTV hoặc Đối tác */
  agentType?: string | null
  /** Lọc theo phương thức thanh toán */
  paymentMethod?: string | null
}

const mapOrderListApiItemToIOrder = (order: OrderListApiItem): IOrder => ({
  id: order.id,
  code: order.code ?? null,
  shiftId: order.shiftId,
  staffId: order.staffId,
  staffName: order.staffName ?? null,
  status: (order.status || order.state) as OrderStatusType,
  state: order.state ?? null,
  paymentStatus: order.paymentStatus ?? null,
  fulfillmentStatus: order.fulfillmentStatus ?? null,
  invoiceStatus: order.invoiceStatus ?? null,
  returnStatus: order.returnStatus ?? null,
  subtotal: order.subtotal ?? 0,
  discount: order.discount ?? 0,
  voucherCode: order.voucherCode ?? undefined,
  voucherDiscount: order.voucherDiscount ?? 0,
  total: order.total ?? 0,
  totalTax: order.totalTax ?? 0,
  paidTotal: order.paidTotal,
  note: order.note ?? undefined,
  refundReason: order.refundReason ?? undefined,
  originalOrderId: order.originalOrderId ?? undefined,
  originalOrderCode: order.originalOrderCode ?? null,
  customerTaxInfo: order.customerTaxInfo ?? null,
  itemsSnapshot: order.itemsSnapshot ?? [],
  paymentsSnapshot: order.paymentsSnapshot ?? [],
  isDeleted: order.isDeleted ?? false,
  canReturn: checkCanReturn({
    status: order.status || order.state,
    canReturn: order.canReturn,
    voucherCode: order.voucherCode,
    voucherDiscount: order.voucherDiscount,
    discount: order.discount,
    returnStatus: order.returnStatus,
    paymentsSnapshot: order.paymentsSnapshot ?? [],
    createdAt:
      order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt).toISOString(),
  }),
  canExchange: checkCanExchange({
    status: order.status || order.state,
    canReturn: order.canReturn,
    canExchange: order.canExchange,
    voucherCode: order.voucherCode,
    voucherDiscount: order.voucherDiscount,
    discount: order.discount,
    returnStatus: order.returnStatus,
    paymentsSnapshot: order.paymentsSnapshot ?? [],
    createdAt:
      order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt).toISOString(),
    originalOrderId: order.originalOrderId,
  }),
  createdAt: new Date(order.createdAt),
  updatedAt: new Date(order.updatedAt),
  totalRefunded: order.totalRefunded ?? 0,
  refunds: order.refunds ?? [],
  refund: order.refund ?? undefined,
  agentType: order.agentType,
  affiliateId: order.affiliateId,
  partnerId: order.partnerId,
  affiliate: order.affiliate as Affiliate | null,
  partner: order.partner,
})

/**
 * Lấy danh sách đơn hàng từ server.
 */
export async function getOrders(params: GetRemoteOrdersParams): Promise<IBaseResponse<IOrder[]>> {
  const { status, searchQuery, dateFrom, dateTo, page = 1, limit = 20, staffId, shiftId } = params
  const normalizedSearchQuery = searchQuery?.trim()

  const urlParams = new URLSearchParams()
  urlParams.append('page', String(page))
  urlParams.append('limit', String(limit))

  if (normalizedSearchQuery) {
    urlParams.append('q', normalizedSearchQuery)
  }

  if (dateFrom) {
    urlParams.append('date_from', startOfDay(dateFrom).toISOString())
  }

  if (dateTo) {
    urlParams.append('date_to', endOfDay(dateTo).toISOString())
  }

  if (staffId) {
    urlParams.append('staff_id', staffId)
  }

  if (shiftId) {
    urlParams.append('shift_id', shiftId)
  }

  if (params.affiliateId) {
    urlParams.append('affiliate_id', params.affiliateId)
  } else if (params.partnerId) {
    urlParams.append('partner_id', params.partnerId)
  } else if (params.agentType) {
    urlParams.append('agent_type', params.agentType)
  }

  if (params.paymentMethod) urlParams.append('payment_method', params.paymentMethod)

  if (status) {
    if (Array.isArray(status)) {
      status.forEach((s) => {
        if (s) urlParams.append('status', s)
      })
    } else if (typeof status === 'string' && status.includes(',')) {
      status.split(',').forEach((s) => {
        const trimmed = s.trim()
        if (trimmed) urlParams.append('status', trimmed)
      })
    } else {
      urlParams.append('status', status)
    }
  }
  try {
    const response = await AxiosService.getInstance().get<PagedResponse<OrderListApiItem>>(
      '/v1/pos/orders',
      { params: urlParams },
    )

    const rawData = response.data as any
    const items = rawData.items || rawData.data || (Array.isArray(rawData) ? rawData : [])
    const meta = rawData.meta || {}

    const totalCount =
      meta.total ?? meta.totalCount ?? rawData.totalCount ?? rawData.total ?? items.length
    const totalItems =
      meta.totalItems ?? meta.total_items ?? rawData.totalItems ?? rawData.total_items ?? 0
    const totalRevenue =
      meta.totalRevenue ?? meta.total_revenue ?? rawData.totalRevenue ?? rawData.total_revenue ?? 0

    const currentPage = meta.page ?? rawData.page ?? page
    const pageSize = meta.limit ?? meta.pageSize ?? rawData.pageSize ?? rawData.limit ?? limit
    const totalPages =
      meta.totalPages ?? rawData.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0)
    const hasNextPage = meta.hasNextPage ?? rawData.hasNextPage ?? currentPage < totalPages

    return {
      success: true,
      status_code: 200,
      message: 'Lấy danh sách đơn hàng thành công',
      data: items.map(mapOrderListApiItemToIOrder),
      meta: {
        total: totalCount,
        totalItems,
        totalRevenue,
        page: currentPage,
        limit: pageSize,
        totalPages,
        hasNextPage,
        timestamp: Date.now(),
      },
      error: null,
    }
  } catch (error) {
    const typedError = error as {
      response?: { status?: number; data?: { error?: string; traceId?: string } }
      message?: string
    }
    const status = typedError?.response?.status
    const data = typedError?.response?.data
    const code = typeof data?.error === 'string' ? data.error : undefined
    const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

    throw new OrderApiError(code || typedError?.message || 'order.list_failed', {
      code,
      status,
      traceId,
    })
  }
}
