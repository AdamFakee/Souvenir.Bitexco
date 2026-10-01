import { CheckoutPayloadBuilder } from './checkout-payload.builder'
import type { AppliedVoucher, CartItem } from '@/shared/types'

describe('CheckoutPayloadBuilder', () => {
  const mockItems: CartItem[] = [
    {
      id: 'p1',
      price: 100000,
      quantity: 2,
      discountAmount: 5000,
      product: {
        id: 'p1',
        name: 'Áo thun',
        price: 100000,
        sku: 'AO01',
        unit: 'cái',
        unitId: 'unit-1',
        taxRate: 10,
      },
    },
  ]

  it('converts CartItem[] to PosCartLine[] accurately', () => {
    const lines = CheckoutPayloadBuilder.toCartLines(mockItems)

    expect(lines).toHaveLength(1)
    expect(lines[0]).toEqual({
      variantId: 'p1',
      unitId: 'unit-1',
      qty: 2,
      unitPrice: 100000,
      discountAmount: 5000,
      taxRate: 10,
    })
  })

  it('builds PosCheckoutRequest for cash payment correctly', () => {
    const voucher: AppliedVoucher = {
      code: 'SALE10',
      voucherType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: null,
      maxDiscountAmount: null,
      applicableVariantIds: null,
    }

    const request = CheckoutPayloadBuilder.buildRequest({
      sessionId: 'session-123',
      items: mockItems,
      payments: [
        {
          method: 'cash',
          amount: 195000,
          provider: null,
          cardTerminalId: null,
          cashTendered: 200000,
          cashChange: 5000,
        },
      ],
      appliedVoucher: voucher,
      affiliateId: 'aff-456',
      agentType: 'collaborator',
      notes: 'Khách yêu cầu hóa đơn',
    })

    expect(request.cashSessionId).toBe('session-123')
    expect(request.voucherCode).toBe('SALE10')
    expect(request.affiliateId).toBe('aff-456')
    expect(request.partnerId).toBeNull() // collaborator -> partnerId is null
    expect(request.agentType).toBe('collaborator')
    expect(request.notes).toBe('Khách yêu cầu hóa đơn')
    expect(request.payments).toHaveLength(1)
    expect(request.payments[0].method).toBe('cash')
    expect(request.lines).toHaveLength(1)
  })

  it('assigns partnerId when agentType is agent', () => {
    const request = CheckoutPayloadBuilder.buildRequest({
      sessionId: 'session-999',
      items: mockItems,
      payments: [
        {
          method: 'cong_no',
          amount: 200000,
          provider: null,
          cardTerminalId: null,
        },
      ],
      affiliateId: 'agent-123',
      agentType: 'agent',
    })

    expect(request.partnerId).toBe('agent-123')
    expect(request.affiliateId).toBeNull()
    expect(request.agentType).toBe('agent')
  })
})
