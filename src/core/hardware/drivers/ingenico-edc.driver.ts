import { AppError } from '@/shared/errors/app-error'
import { storage } from '@/shared/lib/storage'
import PaymentPortable from '../../../../modules/payment-portable'

export interface TerminalConfig {
  posUrl: string
  merchantName: string
  cashierId: string
  license: string
}

const DEFAULT_POS_URL = 'http://192.168.1.5:8080'

export const getPortablePosUrl = (): string => {
  return DEFAULT_POS_URL
}

export const setPortablePosUrl = (url: string): void => {
  if (!url) {
    storage.remove('portable_pos_url')
  } else {
    storage.set('portable_pos_url', url)
  }
}

/**
 * Driver thuần túy tương tác với máy POS EDC qua Native Module PaymentPortable.
 * Sử dụng AppError chuẩn hóa đa ngôn ngữ với i18nKey bắt buộc.
 */
export const IngenicoEdcDriver = {
  connect: async (config: TerminalConfig): Promise<string> => {
    if (!PaymentPortable || typeof PaymentPortable.doConnect !== 'function') {
      throw new AppError({
        code: 'HW_EDC_MODULE_MISSING',
        category: 'HARDWARE',
        i18nKey: 'errors.hardware.edc_module_missing',
        userMessage: 'Ứng dụng chưa nạp được Module kết nối máy quẹt thẻ EDC.',
      })
    }

    if (!config || !config.posUrl || !config.merchantName || !config.cashierId || !config.license) {
      throw new AppError({
        code: 'HW_EDC_MISSING_CONFIG',
        category: 'VALIDATION',
        i18nKey: 'errors.hardware.edc_missing_config',
        userMessage: 'Chưa cấu hình đủ tham số kết nối máy POS thanh toán.',
      })
    }

    try {
      const { posUrl, merchantName, cashierId, license } = config
      return await PaymentPortable.doConnect(posUrl, merchantName, cashierId, license)
    } catch (nativeErr: any) {
      throw new AppError({
        code: 'HW_EDC_CONNECT_FAILED',
        category: 'HARDWARE',
        i18nKey: 'errors.hardware.edc_connect_failed',
        userMessage: 'Không thể kết nối tới máy EDC. Vui lòng kiểm tra cáp mạng.',
        rawDetails: nativeErr,
      })
    }
  },

  executeCommand: async (command: string): Promise<string> => {
    if (!PaymentPortable || typeof PaymentPortable.doCommand !== 'function') {
      throw new AppError({
        code: 'HW_EDC_MODULE_MISSING',
        category: 'HARDWARE',
        i18nKey: 'errors.hardware.edc_module_missing',
        userMessage: 'Ứng dụng chưa nạp được Module kết nối máy quẹt thẻ EDC.',
      })
    }

    try {
      return await PaymentPortable.doCommand(command)
    } catch (nativeErr: any) {
      throw new AppError({
        code: 'HW_EDC_EXECUTE_FAILED',
        category: 'HARDWARE',
        i18nKey: 'errors.hardware.edc_execute_failed',
        userMessage: 'Giao dịch quẹt thẻ thất bại hoặc hết thời gian chờ.',
        rawDetails: nativeErr,
      })
    }
  },
}
