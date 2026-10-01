import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'

/**
 * OrderRaw - Cấu trúc dữ liệu Đơn hàng khớp 100% với Backend/Database (Wire format).
 * Phải giữ nguyên snake_case, không kế thừa từ UI interface.
 */
export interface OrderRaw {
  id: string
  code?: string | null
  order_code?: string | null
  shift_id: string
  staff_id: string
  status: OrderStatus
  subtotal: number
  discount: number
  voucher_code?: string | null
  voucher_discount: number
  total: number
  total_tax: number
  note?: string | null
  refund_reason?: string | null
  original_order_id?: string | null
  customer_tax_info: TaxInfo | null
  items_snapshot: ItemSnapshot[]
  payments_snapshot: PaymentSnapshot[]
  is_deleted: boolean
  created_at: number
  updated_at: number
  partner_id?: string | null
  affiliate_id?: string | null
}

export interface OrderSyncChanges {
  orders: {
    created: OrderRaw[]
    updated: OrderRaw[]
    deleted: string[]
  }
}

/**
 * Đồng bộ hàng loạt đơn hàng offline lên server (Bulk Sync)
 */
export async function syncOfflineOrders(orders: OrderRaw[]): Promise<void> {
  if (!orders || orders.length === 0) {
    return
  }
  try {
    const mappedOrders = orders.map((order: any) => {
      const rawCode = order.code || order.order_code || order.id || ''

      const itemsSnapshot = (order.items_snapshot || order.itemsSnapshot || []).map(
        (item: any) => ({
          productId: item.productId || item.product_id || '',
          sku: item.sku || null,
          name: item.name || null,
          price: Number(item.price ?? 0),
          quantity: Number(item.quantity ?? 0),
          subtotal: Number(item.subtotal ?? (item.price ?? 0) * (item.quantity ?? 0)),
          taxRate: Number(item.taxRate ?? item.tax_rate ?? 0),
          taxAmount: Number(item.taxAmount ?? item.tax_amount ?? 0),
          discountAmount: Number(item.discountAmount ?? item.discount_amount ?? 0),
        }),
      )

      const paymentsSnapshot = (order.payments_snapshot || order.paymentsSnapshot || []).map(
        (payment: any) => ({
          method: payment.method || 'cash',
          amount: Number(payment.amount ?? 0),
          cashTendered: payment.cashTendered ?? payment.cash_tendered ?? null,
          cashChange: payment.cashChange ?? payment.cash_change ?? null,
        }),
      )

      const createdAtMs =
        typeof order.created_at === 'number'
          ? order.created_at
          : order.created_at
            ? new Date(order.created_at).getTime()
            : Date.now()
      const updatedAtMs =
        typeof order.updated_at === 'number'
          ? order.updated_at
          : order.updated_at
            ? new Date(order.updated_at).getTime()
            : Date.now()

      return {
        orderCode: rawCode,
        shiftId: order.shiftId || order.shift_id || '',
        staffId: order.staffId || order.staff_id || '',
        subTotal: Number(order.subtotal ?? order.subTotal ?? 0),
        discount: Number(order.discount ?? 0),
        totalTax: Number(order.totalTax ?? order.total_tax ?? 0),
        total: Number(order.total ?? 0),
        note: order.note || null,
        createdAt: new Date(createdAtMs).toISOString(),
        updatedAt: new Date(updatedAtMs).toISOString(),
        itemsSnapshot,
        paymentsSnapshot,
        partnerId: order.partnerId || order.partner_id || null,
        affiliateId: order.affiliateId || order.affiliate_id || null,
      }
    })

    const payload = { orders: mappedOrders }
    await AxiosService.getInstance().post('/v1/pos/sync/orders', payload)
  } catch (error: any) {
    console.error(
      '[syncOfflineOrders] Lỗi sync đơn offline:',
      error?.response?.data || error?.message || error,
    )
    throw error
  }
}
