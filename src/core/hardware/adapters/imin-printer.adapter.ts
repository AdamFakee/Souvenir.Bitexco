import {
  IMinPrinterDriver,
  PrintOptions,
  setGlobalPrintCopyNumber,
  subscribePrintCopyNumber,
} from '../drivers/imin-printer.driver'
import { IPrinterAdapter } from '../interfaces/printer.interface'

export class IMinPrinterAdapter implements IPrinterAdapter {
  async printComponent(ref: any, options?: PrintOptions): Promise<{ success: boolean }> {
    return await IMinPrinterDriver.printComponent(ref, options)
  }

  async printBitmap(imageSource: string, options?: PrintOptions): Promise<{ success: boolean }> {
    return await IMinPrinterDriver.printBitmap(imageSource, options)
  }

  async openCashBox(): Promise<{ success: boolean }> {
    return await IMinPrinterDriver.openCashBox()
  }

  setCopyNumber(copyNo: number): void {
    setGlobalPrintCopyNumber(copyNo)
  }

  subscribeCopyNumber(cb: (copyNo: number) => void): () => void {
    return subscribePrintCopyNumber(cb)
  }
}
