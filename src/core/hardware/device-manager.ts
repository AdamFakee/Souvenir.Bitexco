import { IMinPrinterAdapter } from './adapters/imin-printer.adapter'
import { IMinViceScreenAdapter } from './adapters/imin-vice-screen.adapter'
import { IngenicoEdcAdapter } from './adapters/ingenico-edc.adapter'
import { TerminalConfig } from './drivers/ingenico-edc.driver'
import { EdcExecuteResult, IEdcAdapter } from './interfaces/edc.interface'
import { IPrinterAdapter, PrintOptions } from './interfaces/printer.interface'
import {
  IViceScreenAdapter,
  ShowCashPaymentPayload,
  ShowMixPaymentPayload,
  ShowPaymentPayload,
  ShowPromoPayload,
  UpdateCartPayload,
} from './interfaces/vice-screen.interface'

export class DeviceManagerFacade {
  readonly viceScreen: IViceScreenAdapter
  readonly printer: IPrinterAdapter
  readonly edc: IEdcAdapter

  constructor(
    viceScreen: IViceScreenAdapter = new IMinViceScreenAdapter(),
    printer: IPrinterAdapter = new IMinPrinterAdapter(),
    edc: IEdcAdapter = new IngenicoEdcAdapter(),
  ) {
    this.viceScreen = viceScreen
    this.printer = printer
    this.edc = edc
  }

  // --- Convenience Shortcuts for Vice Screen ---
  updateViceCart(payload: UpdateCartPayload): void {
    this.viceScreen.updateCart(payload)
  }

  showVicePayment(payload: ShowPaymentPayload): void {
    this.viceScreen.showPayment(payload)
  }

  showVicePortablePayment(payload?: { total: number }): void {
    this.viceScreen.showPortablePayment(payload)
  }

  showViceMixPayment(payload: ShowMixPaymentPayload): void {
    this.viceScreen.showMixPayment(payload)
  }

  showViceCashPayment(payload: ShowCashPaymentPayload): void {
    this.viceScreen.showCashPayment(payload)
  }

  vicePaymentSuccess(payload: ShowCashPaymentPayload): void {
    this.viceScreen.paymentSuccess(payload)
  }

  showVicePromo(payload: ShowPromoPayload): void {
    this.viceScreen.showPromo(payload)
  }

  setViceCustomer(name: string): void {
    this.viceScreen.setCustomer(name)
  }

  setViceOrderId(orderId: string): void {
    this.viceScreen.setOrderId(orderId)
  }

  showViceStatus(payload: {
    type: 'info' | 'error' | 'success'
    title: string
    message: string
  }): void {
    this.viceScreen.showStatus(payload)
  }

  // --- Convenience Shortcuts for Printer ---
  printComponent(ref: any, options?: PrintOptions): Promise<{ success: boolean }> {
    return this.printer.printComponent(ref, options)
  }

  printBitmap(imageSource: string, options?: PrintOptions): Promise<{ success: boolean }> {
    return this.printer.printBitmap(imageSource, options)
  }

  openCashBox(): Promise<{ success: boolean }> {
    return this.printer.openCashBox()
  }

  // --- Convenience Shortcuts for EDC Payment ---
  connectEdc(config?: TerminalConfig): Promise<boolean> {
    return this.edc.connect(config)
  }

  executeEdcCommand(command: string): Promise<EdcExecuteResult> {
    return this.edc.executeCommand(command)
  }
}

export const DeviceManager = new DeviceManagerFacade()
