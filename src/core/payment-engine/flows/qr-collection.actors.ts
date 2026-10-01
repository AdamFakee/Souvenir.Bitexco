import { TenantConfig } from '@/features/app/types/app.types'
import { generateQrCode, getPaymentStatus, transitionPayment } from '@/features/payment/api'
import { fromPromise } from 'xstate'

export const fetchQrActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      paymentId: string
      amount: number
      orderCode: string
      tenantConfig: TenantConfig | null
    }
  }) => {
    const params = {
      bankCode: input.tenantConfig?.bankCode || '---',
      accountNo: input.tenantConfig?.accountNo || '---',
      accountName: input.tenantConfig?.accountName || '---',
      amount: input.amount,
      description: `Thanh toan don ${input.orderCode}`,
    }

    if (!input.paymentId) {
      throw new Error('Thiếu paymentId — không thể tạo mã QR.')
    }
    try {
      const qrData = await generateQrCode(input.paymentId, params)
      if (qrData && (qrData.qrPayload || qrData.qrUrl)) {
        return qrData
      }
      throw new Error('Server không trả về nội dung mã QR.')
    } catch (err) {
      throw err
    }
  },
)

export const checkQrPaymentStatusActor = fromPromise(
  async ({ input }: { input: { paymentId: string } }) => {
    const payment = await getPaymentStatus(input.paymentId)
    return payment
  },
)

export const forceCaptureQrActor = fromPromise(
  async ({ input }: { input: { paymentId: string; paymentVersion?: number } }): Promise<number> => {
    let payment = await getPaymentStatus(input.paymentId)
    let version = payment.version

    if (payment.state === 'INITIATED') {
      const res = await transitionPayment(input.paymentId, {
        action: 'process',
        expectedVersion: version,
      })
      payment.state = 'PROCESSING'
      version = res.version
    }

    if (payment.state === 'PROCESSING') {
      const res = await transitionPayment(input.paymentId, {
        action: 'authorize',
        expectedVersion: version,
      })
      payment.state = 'AUTHORIZED'
      version = res.version
    }

    if (payment.state === 'AUTHORIZED') {
      const res = await transitionPayment(input.paymentId, {
        action: 'capture',
        expectedVersion: version,
        reason: 'cashier_force_completed_qr',
      })
      version = res.version
    }

    return version
  },
)

export const voidPaymentActor = fromPromise(
  async ({ input }: { input: { paymentId: string | null } }): Promise<void> => {
    if (!input.paymentId) return
    try {
      const payment = await getPaymentStatus(input.paymentId)
      if (['INITIATED', 'PROCESSING', 'AUTHORIZED'].includes(payment.state)) {
        await transitionPayment(input.paymentId, {
          action: 'void',
          expectedVersion: payment.version,
          reason: 'cashier_cancelled_payment',
        })
      }
    } catch (err) {
      throw err
    }
  },
)
