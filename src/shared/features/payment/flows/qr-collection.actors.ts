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
    if (payment.state !== 'CAPTURED') {
      throw new Error('NOT_CAPTURED_YET')
    }
    return payment
  },
)
