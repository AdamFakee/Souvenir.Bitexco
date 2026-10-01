import { cardCapture, transitionPayment } from '@/features/payment/api'
import type { PortablePaymentCommandResult } from '@/features/payment/types'
import { PortablePaymentService } from '@/features/payment/utils/portable-payment.service'
import { fromPromise } from 'xstate'

/**
 * Kiểm tra xem lỗi có phải do mất kết nối socket hay timeout giữa chừng không
 */
export function isCommunicationLossError(error: any): boolean {
  const msg = String(error?.message || '').toUpperCase()
  return (
    msg.includes('TIMEOUT') ||
    msg.includes('SOCKET') ||
    msg.includes('DISCONNECT') ||
    msg.includes('CONNECTION_LOST') ||
    msg.includes('NETWORK_ERROR') ||
    msg.includes('LOST') ||
    msg.includes('SIGNAL')
  )
}

/**
 * Kiểm tra kết quả giao dịch thanh toán thành công hay không
 */
export function checkSuccessPayment(
  parsed: PortablePaymentCommandResult | null | undefined,
): boolean {
  if (!parsed) return false
  return (
    parsed.status === 'DONE' &&
    parsed.transInfo?.returnCode === '00' &&
    (parsed.statusCode === 0 || parsed.statusCode === '0') &&
    parsed.statusText === 'DONE'
  )
}

export const processPaymentActor = fromPromise(
  async ({ input }: { input: { paymentId: string; paymentVersion: number } }): Promise<number> => {
    const res = await transitionPayment(input.paymentId, {
      action: 'process',
      expectedVersion: input.paymentVersion,
    })
    return res.version
  },
)

export const connectPosActor = fromPromise(async () => {
  const resStr = await PortablePaymentService.connect()
  const parsed = JSON.parse(resStr)
  if (parsed?.statusCode !== 0) {
    throw new Error(parsed?.statusText || 'Xảy ra lỗi khi kết nối tới máy POS thanh toán')
  }
  return resStr
})

export const sendCardSaleCommandActor = fromPromise(
  async ({
    input,
  }: {
    input: { amount: number; paymentId: string }
  }): Promise<PortablePaymentCommandResult> => {
    const cmd = JSON.stringify({
      command: 'sale',
      params: {
        amount: input.amount,
        currency: '704',
        merTransId: input.paymentId, // Dùng paymentId làm merTransId để đối soát
      },
    })
    const resStr = await PortablePaymentService.executeCommand(cmd)
    const parsed = JSON.parse(resStr) as PortablePaymentCommandResult
    if (!checkSuccessPayment(parsed)) {
      throw new Error(parsed?.message || 'Giao dịch thanh toán thất bại')
    }
    return parsed
  },
)

export const verifyLastTransactionActor = fromPromise(
  async ({ input }: { input: { paymentId: string } }): Promise<PortablePaymentCommandResult> => {
    const cmd = JSON.stringify({ command: 'last_trans', params: {} })
    const resStr = await PortablePaymentService.executeCommand(cmd)
    const parsed = JSON.parse(resStr) as PortablePaymentCommandResult
    const isSuccess = checkSuccessPayment(parsed) && parsed?.merTransId === input.paymentId
    if (!isSuccess) {
      throw new Error('Đối soát: Giao dịch cuối không khớp hoặc thất bại!')
    }
    return parsed
  },
)

export const cardCaptureActor = fromPromise(
  async ({
    input,
  }: {
    input: { paymentId: string; edcResult: PortablePaymentCommandResult }
  }): Promise<void> => {
    const transInfo = input.edcResult.transInfo
    await cardCapture(input.paymentId, {
      terminalId: transInfo?.tid || 'unknown',
      merchantId: transInfo?.mid || 'unknown',
      maskedPan: transInfo?.cardNo || 'unknown',
      authCode: transInfo?.approvalCode || 'unknown',
      rrn: transInfo?.refNo || 'unknown',
    })
  },
)

export const cardCaptureManualActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      paymentId: string
      manualDetails: {
        terminalId?: string
        merchantId?: string
        referenceNumber?: string
        approvalCode?: string
      }
    }
  }): Promise<void> => {
    await cardCapture(input.paymentId, {
      terminalId: input.manualDetails?.terminalId || 'unknown',
      merchantId: input.manualDetails?.merchantId || 'unknown',
      maskedPan: 'unknown',
      authCode: input.manualDetails?.approvalCode || 'unknown',
      rrn: input.manualDetails?.referenceNumber || 'unknown',
    })
  },
)

export const authorizePaymentActor = fromPromise(
  async ({ input }: { input: { paymentId: string; paymentVersion: number } }): Promise<number> => {
    const res = await transitionPayment(input.paymentId, {
      action: 'authorize',
      expectedVersion: input.paymentVersion,
    })
    return res.version
  },
)

export const capturePaymentActor = fromPromise(
  async ({ input }: { input: { paymentId: string; paymentVersion: number } }): Promise<number> => {
    const res = await transitionPayment(input.paymentId, {
      action: 'capture',
      expectedVersion: input.paymentVersion,
    })
    return res.version
  },
)

export const cancelPaymentActor = fromPromise(
  async ({
    input,
  }: {
    input: { paymentId: string | null; paymentVersion: number }
  }): Promise<void> => {
    if (!input.paymentId) return
    try {
      await transitionPayment(input.paymentId, {
        action: 'void',
        expectedVersion: input.paymentVersion,
        reason: 'Người dùng hủy giao dịch',
      })
    } catch {}
  },
)
