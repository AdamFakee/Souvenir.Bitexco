import { useAppStore } from '@/features/app/store/use-app-store'
import { storage } from '@/shared/lib/storage'
import PaymentPortable from '../../../../modules/payment-portable'

const DEFAULT_POS_URL = 'http://192.168.1.5:8080'

const MERCHANT_NAME = 'BIDV'
const CASHIER_ID = 'cashier01'
const LICENSE =
  'name=BIDV;bank=BIDV;copyright=Use for BIDV only;signature=894DFE796B2249C2889F30FF2790E550341FC682858C87FDF7B4B4AE90E17D95;expiryDate=2037-12-31;encryption=yes;encoding=base64;userConfirmation=yes;version=20;LCV=1BAE97'

export const getPortablePosUrl = (): string => {
  // return storage.getString('portable_pos_url') || DEFAULT_POS_URL
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
 * Service tương tác trực tiếp với máy POS Ingenico di động qua Expo Native Module.
 */
export const PortablePaymentService = {
  /**
   * Thực hiện kết nối socket trực tiếp tới thiết bị POS Sandbox.
   */
  connect: async (): Promise<string> => {
    if (!PaymentPortable || typeof PaymentPortable.doConnect !== 'function') {
      throw new Error('NATIVE_MODULE_UNAVAILABLE: Expo module PaymentPortable is not loaded!')
    }

    // Lấy config terminal động từ app store/appMachine context
    const appService = useAppStore.getState().appService
    const terminalConfig = appService?.getSnapshot().context.terminalConfig
    // console.log('terminal config', JSON.stringify(terminalConfig, null, 2))

    if (
      !terminalConfig ||
      !terminalConfig.posUrl ||
      !terminalConfig.merchantName ||
      !terminalConfig.cashierId ||
      !terminalConfig.license
    ) {
      throw new Error('Admin chưa cấu hình đủ tham số kết nối máy POS thanh toán.')
    }

    const { posUrl, merchantName, cashierId, license } = terminalConfig
    // console.log('terminal config', JSON.stringify(terminalConfig, null, 2))

    const res = await PaymentPortable.doConnect(posUrl, merchantName, cashierId, license)
    // console.log('[PortablePOS] Direct Connection Response:', res)
    return res
  },

  /**
   * Gửi gói lệnh giao dịch trực tiếp tới máy POS.
   */
  executeCommand: async (command: string): Promise<string> => {
    // console.log('[PortablePOS] Executing direct transaction command:', command)
    if (!PaymentPortable || typeof PaymentPortable.doCommand !== 'function') {
      throw new Error('NATIVE_MODULE_UNAVAILABLE: Expo module PaymentPortable is not loaded!')
    }

    const res = await PaymentPortable.doCommand(command)
    return res
  },
}
