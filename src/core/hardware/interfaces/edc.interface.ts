import { TerminalConfig } from '../drivers/ingenico-edc.driver'
import { PortablePaymentCommandResult } from '../types/edc-device.types'

/**
 * Kết quả thực thi lệnh EDC đã được Adapter đóng gói và validate sẵn
 */
export interface EdcExecuteResult {
  success: boolean
  message: string
  data?: PortablePaymentCommandResult
}

export interface IEdcAdapter {
  connect(config?: TerminalConfig): Promise<boolean>
  executeCommand(command: string): Promise<EdcExecuteResult>
}
