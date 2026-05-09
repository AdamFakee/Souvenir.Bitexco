import { Container } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)

  return (
    <View className="flex-1 items-center justify-center bg-background p-12">
      <Container centered className="rounded-[32px] border-surface-300 p-3">
        <View className="flex-row items-center gap-12">
          {/* Left: QR Code */}
          <View className="rounded-[24px] bg-white p-6 shadow-sm">
            {qrCodeUrl ? (
              <QRCode value={qrCodeUrl} size={320} color="black" backgroundColor="white" />
            ) : (
              <View className="h-[320px] w-[320px] items-center justify-center rounded-xl bg-surface-100">
                <Text className="font-sans text-sm font-bold text-surface-on-variant">
                  Đang chuẩn bị mã QR...
                </Text>
              </View>
            )}
          </View>

          {/* Right: Info */}
          <View className="min-w-[400px]">
            {/* Breakdown */}
            <View className="mb-8 gap-3 border-b border-surface-200 pb-8">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xl font-bold text-surface-on-variant">
                  Tạm tính
                </Text>
                <Text className="font-sans text-2xl font-black text-surface-on">
                  {formatCurrency(subtotal)}
                </Text>
              </View>
              {discount > 0 && (
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-xl font-bold text-primary">Giảm giá</Text>
                  <Text className="font-sans text-2xl font-black text-primary">
                    -{formatCurrency(discount)}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xl font-bold text-surface-on-variant">Thuế</Text>
                <Text className="font-sans text-2xl font-black text-surface-on">
                  {formatCurrency(tax)}
                </Text>
              </View>
            </View>

            {/* Total */}
            <View>
              <Text className="mb-2 font-sans text-2xl font-bold uppercase tracking-widest text-surface-on-variant">
                Tổng thanh toán
              </Text>
              <Text className="font-sans text-7xl font-black text-primary">
                {formatCurrency(total)}
              </Text>
            </View>

            <View className="mt-8 rounded-full bg-primary/10 px-6 py-3">
              <Text className="text-center font-sans text-xl font-bold uppercase tracking-[0.2em] text-primary">
                Quét mã để thanh toán
              </Text>
            </View>
          </View>
        </View>
      </Container>
    </View>
  )
}

export default memo(VicePaymentScreen)
