import { Container } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Image, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <View className="flex-1 items-center justify-center bg-background p-12">
      <Container centered className="rounded-[32px] border-surface-300 p-3">
        {/* QR Code */}
        <View className="rounded-[24px] bg-white p-1">
          {qrCodeUrl ? (
            <Image
              source={{ uri: qrCodeUrl }}
              className="h-[240px] w-[240px]"
              resizeMode="contain"
            />
          ) : (
            <View className="h-[240px] w-[240px] items-center justify-center rounded-xl bg-surface-100">
              <Text className="font-sans text-sm font-bold text-surface-on-variant">
                Đang tạo mã QR...
              </Text>
            </View>
          )}
        </View>

        {/* Thông tin số tiền */}
        <View className="mt-8 items-center">
          <Text className="mb-2 text-center font-sans text-5xl font-black text-primary">
            {formatCurrency(total)}
          </Text>
          <Text className="text-center font-sans text-lg font-bold uppercase tracking-widest text-surface-on-variant">
            Quét mã để thanh toán
          </Text>
        </View>
      </Container>
    </View>
  )
}

export default memo(VicePaymentScreen)
