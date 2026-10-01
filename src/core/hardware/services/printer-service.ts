import { DeviceManager } from '../device-manager'

export const PrinterService = {
  async printBitmap(uri: string, opts?: { width?: number; height?: number }) {
    return DeviceManager.printer.printBitmap(uri, opts)
  },

  async printReceiptBitmap(uri: string, opts?: { copies?: number }) {
    return DeviceManager.printer.printBitmap(uri)
  },

  async printComponent(component: any, opts?: any) {
    return DeviceManager.printer.printComponent(component, opts)
  },

  async openCashBox() {
    return DeviceManager.printer.openCashBox()
  },
}
