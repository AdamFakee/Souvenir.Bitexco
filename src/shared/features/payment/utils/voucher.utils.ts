import { AppliedVoucher } from '../../pos/store/use-cart-store'

/**
 * Tính toán số tiền giảm giá dựa trên voucher
 * @param subtotal Tổng tiền trước giảm giá (tạm tính)
 * @param voucher Thông tin voucher đang áp dụng
 * @param fallbackDiscount Số tiền giảm giá nếu không có voucher
 * @returns Số tiền được giảm
 */
export const calculateVoucherDiscount = (
  subtotal: number,
  voucher: AppliedVoucher | null | undefined,
  fallbackDiscount: number = 0,
): number => {
  if (voucher) {
    let discountAmount = subtotal * (voucher.percent / 100)
    if (voucher.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount)
    }
    return discountAmount
  }
  return fallbackDiscount
}
