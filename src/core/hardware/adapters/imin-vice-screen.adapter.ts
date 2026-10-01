import {
  IMinViceScreenDriver,
  ShowCashPaymentPayload,
  ShowMixPaymentPayload,
  ShowPaymentPayload,
  ShowPromoPayload,
  UpdateCartPayload,
} from '../drivers/imin-vice-screen.driver'
import { IViceScreenAdapter } from '../interfaces/vice-screen.interface'

export class IMinViceScreenAdapter implements IViceScreenAdapter {
  updateCart(payload: UpdateCartPayload): void {
    IMinViceScreenDriver.updateCart(payload)
  }

  showPayment(payload: ShowPaymentPayload): void {
    IMinViceScreenDriver.showPayment(payload)
  }

  showPortablePayment(payload?: { total: number }): void {
    IMinViceScreenDriver.showPortablePayment(payload)
  }

  showMixPayment(payload: ShowMixPaymentPayload): void {
    IMinViceScreenDriver.showMixPayment(payload)
  }

  showCashPayment(payload: ShowCashPaymentPayload): void {
    IMinViceScreenDriver.showCashPayment(payload)
  }

  paymentSuccess(payload: ShowCashPaymentPayload): void {
    IMinViceScreenDriver.paymentSuccess(payload)
  }

  showPromo(payload: ShowPromoPayload): void {
    IMinViceScreenDriver.showPromo(payload)
  }

  setCustomer(name: string): void {
    IMinViceScreenDriver.setCustomer(name)
  }

  setOrderId(orderId: string): void {
    IMinViceScreenDriver.setOrderId(orderId)
  }

  showStatus(payload: {
    type: 'info' | 'error' | 'success'
    title: string
    message: string
  }): void {
    IMinViceScreenDriver.showStatus(payload)
  }
}
