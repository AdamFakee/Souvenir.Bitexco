import { ViceService } from '@/screens/vice-service'
import { Button, LoadingIndicator, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { AlertCircle, CheckCircle, QrCode } from 'lucide-react-native'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { ShiftLocalAPI } from '@/shared/features/shift/api/local'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { PaymentRemoteAPI } from '../api/remote/payment.remote.api'
import { PaymentPopupProps, PaymentPopupRef } from '../types'

type QrStatus = 'IDLE' | 'CREATING_ORDER' | 'FETCHING_QR' | 'WAITING_PAYMENT' | 'SUCCESS' | 'ERROR'

export const QrPaymentPopup = forwardRef<PaymentPopupRef, PaymentPopupProps>(
  ({ total, discount, items, staffId, shiftId, voucherCode, activeSessionId, onSuccess }, ref) => {
    const [visible, setVisible] = useState(false)
    const [status, setStatus] = useState<QrStatus>('IDLE')
    const [qrContent, setQrContent] = useState<string | null>(null)
    const [billNumber, setBillNumber] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const orderIdRef = useRef<string | null>(null)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    const startPolling = (orderId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const { isPaid } = await PaymentRemoteAPI.verifyPaymentTransaction(orderId)
          if (isPaid) {
            stopPolling()
            setStatus('SUCCESS')

            // Đồng bộ trạng thái thành công lên Vice Screen
            ViceService.paymentSuccess({ total, customerPaid: total, change: 0 })

            // Đợi 1 chút để khách xem UI thành công rồi mới đóng và hoàn tất đơn
            setTimeout(() => {
              setVisible(false)
              onSuccess({
                success: true,
                method: PaymentMethod.BANK_TRANSFER,
                paidAmount: total,
                change: 0,
                referenceCode: billNumber ?? orderId,
                isOnline: true,
                orderId: orderId,
              })
            }, 1500)
          }
        } catch (error) {
          // Lỗi mạng khi poll -> tiếp tục poll lần sau
          console.error('Polling payment status failed:', error)
        }
      }, 5000) // Poll mỗi 5 giây theo yêu cầu
    }

    const startFlow = async () => {
      setErrorMsg(null)
      setQrContent(null)
      try {
        // 0. Kiểm tra ca làm việc local trước khi bắt đầu
        await ShiftLocalAPI.getShiftById(shiftId)

        // 1. Tạo đơn hàng (CREATING_ORDER)
        setStatus('CREATING_ORDER')
        const { orderId } = await PaymentRemoteAPI.createOrder({
          items,
          total,
          discount,
          voucherCode,
          staffId,
          shiftId,
        })
        orderIdRef.current = orderId

        // 2. Lấy QR (FETCHING_QR)
        setStatus('FETCHING_QR')
        const { qrContent: content, billNumber: bill } = await PaymentRemoteAPI.getQrCode(orderId)
        setQrContent(content)
        setBillNumber(bill)

        // Cập nhật Vice Screen với URL thật
        ViceService.showPayment({ qrCodeUrl: content, total })

        // 3. Chờ thanh toán (WAITING_PAYMENT)
        setStatus('WAITING_PAYMENT')
        startPolling(orderId)
      } catch (err: any) {
        setStatus('ERROR')
        setErrorMsg(err?.message ?? 'Lỗi kết nối máy chủ')
      }
    }

    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true)
        setStatus('IDLE')
        startFlow()
      },
      close: () => {
        stopPolling()
        setVisible(false)
      },
    }))

    const handleCancel = () => {
      stopPolling()
      setVisible(false)
    }

    const QR_STATE: Record<
      QrStatus,
      { label: string; isLoading: boolean; isSuccess: boolean; isError: boolean }
    > = {
      IDLE: { label: 'Đang khởi tạo...', isLoading: true, isSuccess: false, isError: false },
      CREATING_ORDER: {
        label: 'Đang tạo đơn hàng...',
        isLoading: true,
        isSuccess: false,
        isError: false,
      },
      FETCHING_QR: {
        label: 'Đang lấy mã QR...',
        isLoading: true,
        isSuccess: false,
        isError: false,
      },
      WAITING_PAYMENT: {
        label: 'Đang chờ khách quét mã thanh toán',
        isLoading: true,
        isSuccess: false,
        isError: false,
      },
      SUCCESS: {
        label: 'Thanh toán thành công!',
        isLoading: false,
        isSuccess: true,
        isError: false,
      },
      ERROR: {
        label: errorMsg ?? 'Có lỗi xảy ra',
        isLoading: false,
        isSuccess: false,
        isError: true,
      },
    }
    const { label: statusLabel, isLoading, isSuccess, isError } = QR_STATE[status]

    return (
      <ModalBase visible={visible} onClose={handleCancel} className="max-w-[860px]">
        {/* Header */}
        <View className="border-b border-outline-variant bg-surface-50 px-6 py-4">
          <Text className="text-2xl font-bold text-surface-on">Thanh toán QR code</Text>
        </View>

        {/* Content */}
        <View className="flex-row bg-surface-100">
          {/* Thông tin đơn */}
          <View className="flex-[4] justify-center border-r border-outline-variant p-8">
            <View className="mb-8">
              <Text className="text-surface-onVariant mb-2 text-sm font-semibold uppercase tracking-wider">
                Cần thanh toán
              </Text>
              <Text className="text-5xl font-black text-primary">{formatCurrency(total)}</Text>
            </View>

            <View className="gap-6 rounded-2xl border border-outline-variant bg-surface-50 p-6">
              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Mã hóa đơn</Text>
                <Text className="text-lg font-bold text-surface-on">
                  {billNumber ?? 'Đang tạo...'}
                </Text>
              </View>
              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Mã giỏ hàng</Text>
                <Text className="text-lg font-bold text-surface-on">
                  {activeSessionId || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* QR & Trạng thái */}
          <View className="flex-[6] flex-col items-center justify-center bg-white p-12">
            <View className="mb-8 rounded-[32px] border-[8px] border-primary/10 bg-white p-6 shadow-2xl shadow-primary/20">
              {isSuccess ? (
                <View className="h-[240px] w-[240px] items-center justify-center">
                  <CheckCircle size={80} color="#22c55e" />
                  <Text className="mt-4 text-center text-xl font-bold text-green-600">
                    Đã nhận tiền!
                  </Text>
                </View>
              ) : isError ? (
                <View className="h-[240px] w-[240px] items-center justify-center p-4">
                  <AlertCircle size={64} color="#ef4444" />
                  <Text className="mt-4 text-center text-sm text-red-500">{errorMsg}</Text>
                </View>
              ) : qrContent ? (
                <QRCode value={qrContent} size={240} />
              ) : (
                <View className="h-[240px] w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface-100">
                  <QrCode size={64} color={COLORS.surface.onVariant} />
                  <Text className="mt-4 px-4 text-center font-medium text-surface-on-variant">
                    {isLoading ? 'Hệ thống đang chuẩn bị mã QR...' : 'Vui lòng thử lại'}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-3 rounded-full border border-surface-200 bg-surface-100 px-6 py-3">
              {!isSuccess && !isError && <LoadingIndicator />}
              <Text className="text-surface-onVariant font-semibold tracking-wide">
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row-reverse gap-4 border-t border-outline-variant bg-surface-50 px-6 py-4">
          {isError && (
            <Button label="Thử lại" variant="primary" onPress={startFlow} className="h-14 flex-1" />
          )}
          <Button
            label="Hủy giao dịch"
            variant="outline"
            onPress={handleCancel}
            className="h-14 px-8"
          />
        </View>
      </ModalBase>
    )
  },
)

QrPaymentPopup.displayName = 'QrPaymentPopup'
export default QrPaymentPopup
