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
    // Tính tổng tiền của các sản phẩm được áp dụng voucher
    const applicableTotal = items
      .filter((item) => {
        if (!voucher.applicableVariantIds || voucher.applicableVariantIds.length === 0) {
          return true // Áp dụng cho tất cả nếu không chỉ định ID
        }
        return voucher.applicableVariantIds.includes(item.product.id)
      })
      .reduce((sum, item) => sum + item.price * item.quantity, 0)

    let discountAmount = applicableTotal * (voucher.percent / 100)

    if (voucher.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount)
    }
    return discountAmount
  }
  return fallbackDiscount
}
