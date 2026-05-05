import { database, PaymentModel } from '@/shared/lib/database'
import { PaymentMethod } from '@/shared/lib/database/models/payment'

export interface PaymentCreatePayload {
  method: PaymentMethod
  amount: number
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
  cardType?: string
}

export const PaymentLocalAPI = {
  /**
   * Tạo PaymentModel dưới dạng prepareCreate để cho vào database.batch()
   */
  prepareCreatePayment: (orderId: string, payload: PaymentCreatePayload): PaymentModel => {
    return database.get<PaymentModel>('payments').prepareCreate((p) => {
      p.orderId = orderId
      p.method = payload.method
      p.amount = payload.amount
      p.cashTendered = payload.cashTendered
      p.cashChange = payload.cashChange
      p.referenceCode = payload.referenceCode
      p.cardType = payload.cardType
      p.isDeleted = false
    })
  },
}
