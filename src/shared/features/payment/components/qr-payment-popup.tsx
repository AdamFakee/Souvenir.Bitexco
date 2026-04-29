import { Button, LoadingIndicator, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { CheckCircle, QrCode } from 'lucide-react-native'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

export interface QrPaymentPopupProps {
  total: number
  activeSessionId: string | null
  onCheckout: () => void
}

export interface QrPaymentPopupRef {
  open: () => void
  close: () => void
}

export const QrPaymentPopup = forwardRef<QrPaymentPopupRef, QrPaymentPopupProps>(
  ({ total, activeSessionId, onCheckout }, ref) => {
    const [visible, setVisible] = useState(false)

    useImperativeHandle(ref, () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
    }))

    const handleSuccess = () => {
      setVisible(false)
      onCheckout()
    }

    const handleClose = () => {
      setVisible(false)
    }

    return (
      <ModalBase visible={visible} onClose={handleClose} className="max-w-[860px]">
        {/* Header */}
        <View className="border-b border-outline-variant bg-surface-50 px-6 py-4">
          <Text className="text-2xl font-bold text-surface-on">Thanh toán QR code</Text>
        </View>

        {/* Content Split Layout */}
        <View className="flex-row gap-8 bg-surface-100 p-8">
          {/* Left Column: QR Code */}
          <View className="flex-1 flex-col items-center justify-center rounded-2xl border border-outline-variant bg-surface-50 p-6 ">
            <View className="mb-6 rounded-2xl border border-outline-variant bg-white p-4 shadow-sm">
              {activeSessionId ? (
                <QRCode value={`PAY_${activeSessionId}_${total}`} size={180} />
              ) : (
                <View className="h-[180px] w-[180px] items-center justify-center rounded-xl bg-surface-200">
                  <QrCode size={40} color={COLORS.surface.onVariant} />
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              <LoadingIndicator />
              <Text className="text-surface-onVariant text-sm font-medium">
                Đang chờ thanh toán...
              </Text>
            </View>
          </View>

          {/* Right Column: Transaction Details */}
          <View className="flex-1 justify-center">
            <View className="rounded-2xl border border-outline-variant bg-surface-50 p-6 shadow-sm">
              <Text className="text-surface-onVariant mb-1 text-sm font-medium">Tổng số tiền</Text>
              <Text className="mb-6 text-4xl font-bold text-primary">{formatCurrency(total)}</Text>

              <View className="gap-4">
                <View className="flex-row items-center justify-between border-b border-outline-variant/60 pb-3">
                  <Text className="text-surface-onVariant text-sm">Mã đơn hàng</Text>
                  <Text className="text-sm font-semibold text-surface-on">
                    {activeSessionId || 'N/A'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-outline-variant/60 pb-3">
                  <Text className="text-surface-onVariant text-sm">Ngân hàng</Text>
                  <Text className="text-sm font-semibold text-surface-on">Vietcombank</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-surface-onVariant text-sm">Số tài khoản</Text>
                  <Text className="text-sm font-semibold text-surface-on">00110022334455</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Actions */}
        <View className="flex-row-reverse gap-4 border-t border-outline-variant bg-surface-50 px-6 py-4">
          <Button
            label="Đã nhận được tiền"
            variant="primary"
            onPress={handleSuccess}
            className="h-14 flex-1"
            leftIcon={CheckCircle}
          />
          <Button
            label="Hủy giao dịch"
            variant="outline"
            onPress={handleClose}
            className="h-14 px-8"
          />
        </View>
      </ModalBase>
    )
  },
)

QrPaymentPopup.displayName = 'QrPaymentPopup'
export default QrPaymentPopup
