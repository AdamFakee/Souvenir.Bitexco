import { ViceService } from '@/screens/vice-service'
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
      open: () => {
        setVisible(true)
        const qrUrl = `https://docs.lightburnsoftware.com/legacy/img/QRCode/ExampleCode.png`
        ViceService.showPayment({ qrCodeUrl: qrUrl, total })
      },
      close: () => {
        setVisible(false)
      },
    }))

    const handleSuccess = () => {
      setVisible(false)
      onCheckout()
      ViceService.paymentSuccess({ total, customerPaid: total, change: 0 })
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

        {/* Content Split Layout (4:6) */}
        <View className="flex-row bg-surface-100">
          {/* Left Column: Transaction Details (40%) */}
          <View className="flex-[4] justify-center border-r border-outline-variant p-8">
            <View className="mb-8">
              <Text className="text-surface-onVariant mb-2 text-sm font-semibold uppercase tracking-wider">
                Cần thanh toán
              </Text>
              <Text className="text-5xl font-black text-primary">{formatCurrency(total)}</Text>
            </View>

            <View className="gap-6 rounded-2xl border border-outline-variant bg-surface-50 p-6">
              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Mã đơn hàng</Text>
                <Text className="text-lg font-bold text-surface-on">
                  {activeSessionId || 'N/A'}
                </Text>
              </View>

              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Phương thức</Text>
                <Text className="text-lg font-bold text-surface-on">Chuyển khoản QR</Text>
              </View>
            </View>
          </View>

          {/* Right Column: QR Code (60%) */}
          <View className="flex-[6] flex-col items-center justify-center bg-white p-12">
            <View className="mb-8 rounded-[32px] border-[8px] border-primary/10 bg-white p-6 shadow-2xl shadow-primary/20">
              {activeSessionId ? (
                <QRCode value={`PAY_${activeSessionId}_${total}`} size={240} />
              ) : (
                <View className="h-[240px] w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface-100">
                  <QrCode size={64} color={COLORS.surface.onVariant} />
                  <Text className="mt-4 font-medium text-surface-on-variant">Đang tạo mã...</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-3 rounded-full border border-surface-200 bg-surface-100 px-6 py-3">
              <LoadingIndicator />
              <Text className="text-surface-onVariant font-semibold tracking-wide">
                Đang chờ khách quét mã thanh toán
              </Text>
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
