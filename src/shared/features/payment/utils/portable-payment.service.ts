import { storage } from '@/shared/lib/storage'
import PaymentPortable from '../../../../../modules/payment-portable'

const DEFAULT_POS_URL = 'http://192.168.1.12:8080'

const MERCHANT_NAME = 'TGDD'
const CASHIER_ID = 'cashier01'
const LICENSE =
  'name=TGDD;bank=BIDV;copyright=Use for TGDD only;signature=F9725778F943ABFD16EF0DB9026A2465E3F7BA5ABE1E6E3532CB8483447A6716;expiryDate=2037-12-31;encryption=yes;encoding=base64;userConfirmation=yes;version=20;LCV=4A5995'

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
    const posUrl = getPortablePosUrl()
    // console.log(`[PortablePOS] Connecting socket directly to ${posUrl}...`)
    if (!PaymentPortable || typeof PaymentPortable.doConnect !== 'function') {
      throw new Error('NATIVE_MODULE_UNAVAILABLE: Expo module PaymentPortable is not loaded!')
    }

    const res = await PaymentPortable.doConnect(posUrl, MERCHANT_NAME, CASHIER_ID, LICENSE)
    console.log('[PortablePOS] Direct Connection Response:', res)
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
    // console.log('[PortablePOS] Direct Command Response:', res)
    return res
  },
}
