import { CartCalculator } from './cart-calculator'
import type { AppliedVoucher, CartItem } from '@/shared/types'

describe('CartCalculator', () => {
  const mockItems: CartItem[] = [
    {
      id: 'p1',
      price: 100000,
      quantity: 2,
      product: {
        id: 'p1',
        name: 'Áo thun',
        price: 100000,
        sku: 'AO01',
        unit: 'cái',
        unitId: 'u1',
        taxRate: 10,
      },
    },
    {
      id: 'p2',
      price: 50000,
      quantity: 1,
      product: {
        id: 'p2',
        name: 'Móc khóa',
        price: 50000,
        sku: 'MK01',
        unit: 'cái',
        unitId: 'u2',
        taxRate: 8,
      },
    },
  ]

  it('calculates subtotal and totalQuantity correctly', () => {
    const subtotal = CartCalculator.calculateSubtotal(mockItems)
    const totalQty = CartCalculator.calculateTotalQuantity(mockItems)

    expect(subtotal).toBe(250000) // 100k*2 + 50k*1
    expect(totalQty).toBe(3)
  })

  it('calculates percentage voucher discount correctly', () => {
    const voucher: AppliedVoucher = {
      code: 'DISCOUNT10',
      voucherType: 'PERCENTAGE',
      discountValue: 10,
      percent: 10,
      minOrderValue: 100000,
      maxDiscountAmount: 50000,
      applicableVariantIds: null,
    }

    const discount = CartCalculator.calculateVoucherDiscount(mockItems, voucher)
    expect(discount).toBe(25000) // 10% of 250,000 = 25,000
  })

  it('handles minOrderValue not met', () => {
    const voucher: AppliedVoucher = {
      code: 'BIGDISCOUNT',
      voucherType: 'PERCENTAGE',
      discountValue: 20,
      percent: 20,
      minOrderValue: 500000, // higher than subtotal 250,000
      maxDiscountAmount: null,
      applicableVariantIds: null,
    }

    const validation = CartCalculator.validateVoucher(mockItems, voucher)
    expect(validation.isValid).toBe(false)

    const pricing = CartCalculator.calculate(mockItems, voucher)
    expect(pricing.isVoucherValid).toBe(false)
    expect(pricing.totalDiscount).toBe(0)
    expect(pricing.total).toBe(250000)
  })

  it('calculates full pricing summary with voucher', () => {
    const voucher: AppliedVoucher = {
      code: 'GIAM30K',
      voucherType: 'FIXED',
      discountValue: 30000,
      minOrderValue: 100000,
      maxDiscountAmount: null,
      applicableVariantIds: null,
    }

    const summary = CartCalculator.calculate(mockItems, voucher)

    expect(summary.subtotal).toBe(250000)
    expect(summary.totalQuantity).toBe(3)
    expect(summary.totalDiscount).toBe(30000)
    expect(summary.total).toBe(220000)
    expect(summary.isVoucherValid).toBe(true)
    expect(summary.discounts.length).toBe(1)
    expect(summary.discounts[0].code).toBe('GIAM30K')
  })
})
