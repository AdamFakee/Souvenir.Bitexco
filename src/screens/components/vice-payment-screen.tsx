import { Container } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <View className="flex-1 items-center justify-center bg-background p-12">
      <Container centered className="rounded-[32px] border-surface-300 p-3">
        {/* QR Code */}
        <View className="rounded-[24px] bg-white p-6 shadow-sm">
          {qrCodeUrl ? (
            <QRCode value={qrCodeUrl} size={280} color="black" backgroundColor="white" />
          ) : (
            <View className="h-[280px] w-[280px] items-center justify-center rounded-xl bg-surface-100">
              <Text className="font-sans text-sm font-bold text-surface-on-variant">
                Đang chuẩn bị mã QR...
              </Text>
            </View>
          )}
        </View>

        {/* Thông tin số tiền */}
        <View className="mt-10 items-center">
          <Text className="mb-2 text-center font-sans text-6xl font-black text-primary">
            {formatCurrency(total)}
          </Text>
          <View className="rounded-full bg-primary/10 px-6 py-2">
            <Text className="text-center font-sans text-xl font-bold uppercase tracking-[0.2em] text-primary">
              Quét mã để thanh toán
            </Text>
          </View>
        </View>
      </Container>
    </View>
  )
}

export default memo(VicePaymentScreen)
