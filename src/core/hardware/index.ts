export { DeviceManager, DeviceManagerFacade } from './device-manager'

// Interfaces (Ports)
export type { IViceScreenAdapter } from './interfaces/vice-screen.interface'
export type { IPrinterAdapter, PrintOptions } from './interfaces/printer.interface'
export type { IEdcAdapter, EdcExecuteResult } from './interfaces/edc.interface'
export type { TerminalConfig } from './drivers/ingenico-edc.driver'
export type {
  PortablePaymentCommandResult,
  PortablePaymentTransInfo,
} from './types/edc-device.types'

// Adapters
export { IMinViceScreenAdapter } from './adapters/imin-vice-screen.adapter'
export { IMinPrinterAdapter } from './adapters/imin-printer.adapter'
export { IngenicoEdcAdapter } from './adapters/ingenico-edc.adapter'

// Drivers & Hardware Services
export { IMinPrinterDriver, getPrinterStatusText } from './drivers/imin-printer.driver'

export {
  IngenicoEdcDriver,
  getPortablePosUrl,
  setPortablePosUrl,
} from './drivers/ingenico-edc.driver'

export { PrinterService } from './services/printer-service'
export { useConnectionStore } from './store/use-connection-store'
