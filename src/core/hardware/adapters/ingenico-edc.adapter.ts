import { IngenicoEdcDriver, TerminalConfig } from '../drivers/ingenico-edc.driver'
import { EdcExecuteResult, IEdcAdapter } from '../interfaces/edc.interface'
import { PortablePaymentCommandResult } from '../types/edc-device.types'

export class IngenicoEdcAdapter implements IEdcAdapter {
  async connect(config?: TerminalConfig): Promise<boolean> {
    if (!config) return false
    try {
      await IngenicoEdcDriver.connect(config)
      return true
    } catch {
      return false
    }
  }

  async executeCommand(command: string): Promise<EdcExecuteResult> {
    const responseStr = await IngenicoEdcDriver.executeCommand(command)

    let parsed: PortablePaymentCommandResult
    try {
      parsed = JSON.parse(responseStr)
    } catch {
      return {
        success: false,
        message: 'Dữ liệu phản hồi từ máy EDC không đúng định dạng JSON.',
      }
    }

    // Khớp 100% với logic checkSuccessPayment gốc trong card-collection.actors.ts
    const isStatusDone = !parsed.status || parsed.status === 'DONE'
    const isStatusTextDone = !parsed.statusText || parsed.statusText === 'DONE'
    const isCodeSuccess = parsed.statusCode === '0' || parsed.statusCode === 0
    const isReturnSuccess = !parsed.transInfo?.returnCode || parsed.transInfo.returnCode === '00'

    const isSuccess = isStatusDone && isStatusTextDone && isCodeSuccess && isReturnSuccess

    return {
      success: isSuccess,
      message: isSuccess
        ? 'Giao dịch quẹt thẻ thành công.'
        : parsed.message || parsed.statusText || 'Giao dịch quẹt thẻ bị từ chối.',
      data: parsed,
    }
  }
}
