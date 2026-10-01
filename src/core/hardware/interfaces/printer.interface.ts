import { PrintOptions } from '../drivers/imin-printer.driver'

export type { PrintOptions }

export interface IPrinterAdapter {
  printComponent(ref: any, options?: PrintOptions): Promise<{ success: boolean }>
  printBitmap(imageSource: string, options?: PrintOptions): Promise<{ success: boolean }>
  openCashBox(): Promise<{ success: boolean }>
}
