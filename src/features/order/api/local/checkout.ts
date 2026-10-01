import type { PaymentMethodCode } from '@/features/payment/types/payment.constants'
import type { PortablePaymentCommandResult } from '@/features/payment/types/portable-payment.type'
import { prepareDeductStock } from '@/features/product'
import {
  database,
  OrderModel,
  OrderStatus,
  type ItemSnapshot,
  type PaymentSnapshot,
} from '@/shared/lib/database'
import type { CartItem } from '@/shared/types'
import { generateOfflineOrderCode } from '../../utils'

export interface CheckoutPaymentPayload {
  method: PaymentMethodCode
  amount: number
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
  portablePaymentResult?: PortablePaymentCommandResult
}

export interface CheckoutPayload {
  staffId: string
  shiftId: string
  items: CartItem[]
  subtotal: number
  discount: number
  voucherCode?: string
  voucherDiscount: number
  total: number
  note?: string
  payment: CheckoutPaymentPayload
  affiliateId?: string
  affiliateName?: string
  partnerId?: string
  partnerName?: string
}

/**
 * Thanh toán chung (Tiền mặt, Chuyển khoản, Card...).
 * Chỉ tạo bản ghi OrderModel với đầy đủ Snapshots.
 */
export async function checkoutLocal(payload: CheckoutPayload): Promise<OrderModel> {
  const itemsSnapshot: ItemSnapshot[] = payload.items.map((i) => {
    const taxRate = i.product.taxRate || 0
    const taxAmount =
      taxRate > 0 ? Math.round(i.price * i.quantity * (taxRate / (100 + taxRate))) : 0
    return {
      productId: i.product.id,
      sku: i.product.sku,
      name: i.product.name,
      price: i.price,
      quantity: i.quantity,
      subtotal: i.price * i.quantity,
      taxRate,
      taxAmount,
      discountAmount: 0,
    }
  })

  const totalTax = itemsSnapshot.reduce((sum, item) => sum + item.taxAmount, 0)

  const paymentsSnapshot: PaymentSnapshot[] = [
    {
      method: payload.payment.method,
      amount: payload.payment.amount,
      cashTendered: payload.payment.cashTendered,
      cashChange: payload.payment.cashChange,
      referenceCode: payload.payment.referenceCode,
      portablePaymentResult: payload.payment.portablePaymentResult,
    },
  ]

  const preparedOrder = database.get<OrderModel>('orders').prepareCreate((o) => {
    const now = Date.now()
    o._raw.id = generateOfflineOrderCode()
    ;(o._raw as any).created_at = now
    ;(o._raw as any).updated_at = now
    o.shiftId = payload.shiftId
    o.staffId = payload.staffId
    o.status = OrderStatus.COMPLETED
    o.subtotal = payload.subtotal
    o.discount = payload.discount
    o.affiliateId = payload.affiliateId
    o.affiliateName = payload.affiliateName
    o.partnerId = payload.partnerId
    o.partnerName = payload.partnerName
    o.voucherCode = payload.voucherCode
    o.voucherDiscount = payload.voucherDiscount
    o.total = payload.total
    o.totalTax = totalTax
    o.note = payload.note
    o.itemsSnapshot = itemsSnapshot
    o.paymentsSnapshot = paymentsSnapshot
    o.isDeleted = false
    o.isSynced = false
  })

  const preparedStockUpdates = await prepareDeductStock(payload.items)

  await database.write(async () => {
    await database.batch(preparedOrder, ...preparedStockUpdates)
  })

  return preparedOrder
}
