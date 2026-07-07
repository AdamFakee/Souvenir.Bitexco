import { AppliedVoucher, CartItem } from '../../pos/types/cart.types'

/**
 * Tính toán số tiền giảm giá dựa trên voucher
 * @param items Danh sách sản phẩm trong giỏ hàng
 * @param voucher Thông tin voucher đang áp dụng
 * @param fallbackDiscount Số tiền giảm giá nếu không có voucher
 * @returns Số tiền được giảm
 */
export const calculateVoucherDiscount = (
  items: CartItem[],
  voucher: AppliedVoucher | null | undefined,
  fallbackDiscount: number = 0,
): number => {
  if (voucher) {
    const totalOrderValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Check minimum order value condition (local check for POS preview)
    if (voucher.minOrderValue !== null && totalOrderValue < voucher.minOrderValue) {
      return 0 // Does not meet minimum order value
    }

    // Tính tổng tiền của các sản phẩm được áp dụng voucher
    const applicableTotal = items
      .filter((item) => {
        if (!voucher.applicableVariantIds || voucher.applicableVariantIds.length === 0) {
          return true // Áp dụng cho tất cả nếu không chỉ định ID
        }
        return voucher.applicableVariantIds.includes(item.product.id)
      })
      .reduce((sum, item) => sum + item.price * item.quantity, 0)

    let discountAmount = 0
    if (voucher.voucherType === 'PERCENTAGE') {
      discountAmount = applicableTotal * (voucher.discountValue / 100)
      if (voucher.maxDiscountAmount !== null) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount)
      }
    } else if (voucher.voucherType === 'FIXED') {
      // FIXED discount value applies to the applicable total, up to the total itself
      discountAmount = Math.min(voucher.discountValue, applicableTotal)
    }

    return discountAmount
  }
  return fallbackDiscount
}
