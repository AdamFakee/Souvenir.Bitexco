import { AppliedVoucher, CartItem } from '@/shared/types'
import { calculateLineDiscount } from './voucher.utils'

/**
 * Tính tổng tiền hàng (trước thuế và giảm giá)
 */
export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Tính tổng tiền thuế VAT (trên giá net = đơn giá đã gồm thuế - giảm giá)
 */
export const calculateTotalTax = (items: CartItem[], voucher?: AppliedVoucher | null): number => {
  return items.reduce((sum, item) => {
    const grossPrice = item.price * item.quantity
    const discount = voucher ? calculateLineDiscount(item, items, voucher) : 0
    const netPrice = Math.max(0, grossPrice - discount)
    const taxRate = item.product.taxRate ?? 0
    const taxAmount = taxRate > 0 ? netPrice * (taxRate / (100 + taxRate)) : 0
    return sum + Math.round(taxAmount)
  }, 0)
}

/**
 * Tính tổng số lượng sản phẩm trong giỏ hàng
 */
export const calculateTotalQuantity = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}
