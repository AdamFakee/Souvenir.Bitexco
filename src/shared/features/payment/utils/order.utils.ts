import { CartItem } from '../../pos/types/cart.types'

/**
 * Tính tổng tiền hàng (trước thuế và giảm giá)
 */
export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
}

/**
 * Tính tổng tiền thuế VAT
 */
export const calculateTotalTax = (items: CartItem[]): number => {
  return items.reduce(
    (sum, item) => sum + item.product.price * (item.product.taxRate / 100) * item.quantity,
    0,
  )
}
