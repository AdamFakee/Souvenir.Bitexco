import { TenantConfig } from '@/shared/features/app/types/app.types'
import { PaymentRemoteAPI } from '@/shared/features/payment/api/remote/payment.remote.api'
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

    try {
      const qrData = await PaymentRemoteAPI.generateQrCode(input.paymentId, params)
      console.log('[QR Fetch Reusable] Received QR Response:', JSON.stringify(qrData, null, 2))
      if (qrData && (qrData.qrPayload || qrData.qrUrl)) {
        return qrData
      }
    } catch (err) {
      throw err
    }
  },
)

export const checkQrPaymentStatusActor = fromPromise(
  async ({ input }: { input: { paymentId: string } }) => {
    const payment = await PaymentRemoteAPI.getPaymentStatus(input.paymentId)
    return payment
  },
)

export const forceCaptureQrActor = fromPromise(
  async ({ input }: { input: { paymentId: string; paymentVersion?: number } }): Promise<number> => {
    let payment = await PaymentRemoteAPI.getPaymentStatus(input.paymentId)
    let version = payment.version

    if (payment.state === 'INITIATED') {
      const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
        action: 'process',
        expectedVersion: version,
      })
      payment.state = 'PROCESSING'
      version = res.version
    }

    if (payment.state === 'PROCESSING') {
      const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
        action: 'authorize',
        expectedVersion: version,
      })
      payment.state = 'AUTHORIZED'
      version = res.version
    }

    if (payment.state === 'AUTHORIZED') {
      const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
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
      console.log('[QR Actor] Checking payment status before voiding for ID:', input.paymentId)
      const payment = await PaymentRemoteAPI.getPaymentStatus(input.paymentId)
      if (['INITIATED', 'PROCESSING', 'AUTHORIZED'].includes(payment.state)) {
        console.log(
          '[QR Actor] Voiding payment on server:',
          input.paymentId,
          'version:',
          payment.version,
        )
        await PaymentRemoteAPI.transitionPayment(input.paymentId, {
          action: 'void',
          expectedVersion: payment.version,
          reason: 'cashier_cancelled_payment',
        })
      }
    } catch (err) {
      console.error('[QR Actor] Failed to void payment:', err)
      throw err
    }
  },
)
