import { AppliedVoucher, CartItem } from '@/shared/types'

/**
 * Tính toán số tiền giảm giá dựa trên voucher (tính trên giá trước thuế)
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
    // Voucher trước thuế: base = tổng tiền hàng trước thuế (chưa gồm VAT)
    const totalOrderValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Check minimum order value condition (local check for POS preview)
    if (voucher.minOrderValue !== null && totalOrderValue < voucher.minOrderValue) {
      return 0 // Does not meet minimum order value
    }

    // Tính tổng tiền (trước thuế) của các sản phẩm được áp dụng voucher
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
      const pct =
        voucher.percent !== undefined && voucher.percent !== null
          ? voucher.percent
          : voucher.discountValue
      discountAmount = applicableTotal * (pct / 100)
      if (voucher.maxDiscountAmount !== null) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount)
      }
    } else if (voucher.voucherType === 'FIXED') {
      // FIXED discount value applies to the applicable total, up to the total itself
      discountAmount = Math.min(voucher.discountValue, applicableTotal)
    }

    return Math.round(discountAmount)
  }
  return fallbackDiscount
}

/**
 * Phân bổ số tiền voucher giảm giá cho từng sản phẩm trong giỏ hàng (tính theo tỷ lệ giá trước thuế)
 * @param item Sản phẩm cần tính giảm giá
 * @param items Danh sách sản phẩm trong giỏ hàng
 * @param voucher Thông tin voucher đang áp dụng
 * @returns Số tiền giảm giá phân bổ cho sản phẩm này
 */
export const calculateLineDiscount = (
  item: CartItem,
  items: CartItem[],
  voucher: AppliedVoucher | null | undefined,
): number => {
  if (!voucher) return 0
  const totalDiscount = calculateVoucherDiscount(items, voucher)
  if (totalDiscount <= 0) return 0

  const isApplicable =
    !voucher.applicableVariantIds ||
    voucher.applicableVariantIds.length === 0 ||
    voucher.applicableVariantIds.includes(item.product.id)

  if (!isApplicable) return 0

  // Tính tổng tiền (trước thuế) của tất cả sản phẩm được áp dụng voucher
  const applicableTotal = items
    .filter((i) => {
      if (!voucher.applicableVariantIds || voucher.applicableVariantIds.length === 0) {
        return true
      }
      return voucher.applicableVariantIds.includes(i.product.id)
    })
    .reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (applicableTotal <= 0) return 0

  const share = (item.price * item.quantity) / applicableTotal
  return Math.round(totalDiscount * share)
}
