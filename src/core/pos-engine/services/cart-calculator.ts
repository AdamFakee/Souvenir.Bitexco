import type { Affiliate, AppliedVoucher, CartItem } from '@/shared/types'

export interface AppliedDiscount {
  id: string
  code?: string
  name: string
  amount: number
  type: 'voucher' | 'promotion' | 'partner' | 'manual'
  targetItemId?: string
}

export interface OrderPricingSummary {
  /** Tổng tiền hàng trước giảm giá và thuế */
  subtotal: number
  /** Tổng số lượng sản phẩm trong giỏ */
  totalQuantity: number
  /** Tổng số tiền giảm giá từ tất cả nguồn */
  totalDiscount: number
  /** Danh sách chi tiết các khoản giảm */
  discounts: AppliedDiscount[]
  /** Tổng tiền thuế VAT (trên giá net) */
  taxAmount: number
  /** Số tiền thực tế cần thanh toán */
  total: number
  /** Trạng thái hợp lệ của voucher hiện tại */
  isVoucherValid: boolean
  /** Lý do voucher không hợp lệ (nếu có) */
  voucherInvalidReason?: string
}

/**
 * CartCalculator - Pure calculation engine for Cart & Checkout
 * Single Source of Truth cho toàn bộ logic tính toán tiền hàng, thuế và giảm giá.
 */
export class CartCalculator {
  /**
   * Tính tổng tiền hàng (subtotal)
   */
  static calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  /**
   * Tính tổng số lượng món
   */
  static calculateTotalQuantity(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /**
   * Tính số tiền giảm giá của 1 voucher cụ thể
   */
  static calculateVoucherDiscount(
    items: CartItem[],
    voucher: AppliedVoucher | null | undefined,
    fallbackDiscount: number = 0,
  ): number {
    if (!voucher) return fallbackDiscount

    const totalOrderValue = this.calculateSubtotal(items)

    // Kiểm tra điều kiện đơn hàng tối thiểu
    if (voucher.minOrderValue !== null && totalOrderValue < voucher.minOrderValue) {
      return 0
    }

    // Tính tổng tiền các sản phẩm được áp dụng voucher
    const applicableTotal = items
      .filter((item) => {
        if (!voucher.applicableVariantIds || voucher.applicableVariantIds.length === 0) {
          return true
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
      discountAmount = Math.min(voucher.discountValue, applicableTotal)
    }

    return Math.round(discountAmount)
  }

  /**
   * Phân bổ số tiền voucher cho từng dòng sản phẩm (dùng để tính thuế VAT theo từng dòng)
   */
  static calculateLineDiscount(
    item: CartItem,
    items: CartItem[],
    voucher: AppliedVoucher | null | undefined,
  ): number {
    if (!voucher) return 0
    const totalDiscount = this.calculateVoucherDiscount(items, voucher)
    if (totalDiscount <= 0) return 0

    const isApplicable =
      !voucher.applicableVariantIds ||
      voucher.applicableVariantIds.length === 0 ||
      voucher.applicableVariantIds.includes(item.product.id)

    if (!isApplicable) return 0

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

  /**
   * Tính thuế VAT dựa trên giá net sau khi trừ voucher
   */
  static calculateTotalTax(items: CartItem[], voucher?: AppliedVoucher | null): number {
    return items.reduce((sum, item) => {
      const grossPrice = item.price * item.quantity
      const discount = voucher ? this.calculateLineDiscount(item, items, voucher) : 0
      const netPrice = Math.max(0, grossPrice - discount)
      const taxRate = item.product.taxRate ?? 0
      const taxAmount = taxRate > 0 ? netPrice * (taxRate / (100 + taxRate)) : 0
      return sum + Math.round(taxAmount)
    }, 0)
  }

  /**
   * Kiểm tra tính hợp lệ của voucher đối với giỏ hàng hiện tại
   */
  static validateVoucher(
    items: CartItem[],
    voucher: AppliedVoucher | null | undefined,
  ): { isValid: boolean; reason?: string } {
    if (!voucher) return { isValid: true }
    if (items.length === 0) return { isValid: false, reason: 'Giỏ hàng đang trống' }

    const subtotal = this.calculateSubtotal(items)
    if (voucher.minOrderValue !== null && subtotal < voucher.minOrderValue) {
      return {
        isValid: false,
        reason: `Đơn hàng chưa đạt tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} đ để dùng mã`,
      }
    }

    if (voucher.applicableVariantIds && voucher.applicableVariantIds.length > 0) {
      const hasEligibleProduct = items.some((item) =>
        voucher.applicableVariantIds?.includes(item.product.id),
      )
      if (!hasEligibleProduct) {
        return {
          isValid: false,
          reason: 'Giỏ hàng không chứa sản phẩm được áp dụng mã này',
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Tính toán toàn diện bảng giá cho giỏ hàng (Full Pricing Summary)
   */
  static calculate(
    items: CartItem[],
    appliedVoucher?: AppliedVoucher | null,
    affiliate?: Affiliate | null,
  ): OrderPricingSummary {
    const subtotal = this.calculateSubtotal(items)
    const totalQuantity = this.calculateTotalQuantity(items)
    const discounts: AppliedDiscount[] = []

    // 1. Xử lý Voucher
    const { isValid: isVoucherValid, reason: voucherInvalidReason } = this.validateVoucher(
      items,
      appliedVoucher,
    )

    if (appliedVoucher && isVoucherValid) {
      const voucherDiscount = this.calculateVoucherDiscount(items, appliedVoucher)
      if (voucherDiscount > 0) {
        discounts.push({
          id: appliedVoucher.code,
          code: appliedVoucher.code,
          name: `Mã giảm giá ${appliedVoucher.code}`,
          amount: voucherDiscount,
          type: 'voucher',
        })
      }
    }

    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0)
    const total = Math.max(0, subtotal - totalDiscount)
    const taxAmount = this.calculateTotalTax(items, appliedVoucher)

    return {
      subtotal,
      totalQuantity,
      totalDiscount,
      discounts,
      taxAmount,
      total,
      isVoucherValid,
      voucherInvalidReason,
    }
  }
}
