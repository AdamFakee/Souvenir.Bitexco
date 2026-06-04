import { Shimmer } from '@/shared/components/ui'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

const QRCODE_SIZE = 240

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="m-4 flex-1 items-center justify-center">
        <View className="w-[360px] items-center rounded-[24px] border border-white/20 bg-white p-5 shadow-sm">
          {/* Phần 1: Khung QR Code */}
          <View className="items-center justify-center rounded-[18px] border border-outline-variant bg-white p-3">
            {qrCodeUrl ? (
              qrCodeUrl.startsWith('http') ? (
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={{ width: QRCODE_SIZE, height: QRCODE_SIZE }}
                  resizeMode="contain"
                />
              ) : (
                <QRCode
                  value={qrCodeUrl}
                  size={QRCODE_SIZE}
                  color="black"
                  backgroundColor="white"
                />
              )
            ) : (
              <Shimmer
                className="rounded-[12px]"
                style={{ width: QRCODE_SIZE, height: QRCODE_SIZE }}
              />
            )}
          </View>

          <View className="my-4 w-full border-b border-outline-variant" />

          {/* Phần 2: Số tiền cần thanh toán */}
          <View className="w-full rounded-2xl border border-outline-variant bg-white px-4 py-3">
            <Text className="text-center text-2xl font-bold uppercase tracking-wide text-muted">
              Tổng thanh toán
            </Text>
            <Text
              className="mt-1 text-center text-3xl font-black text-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
})

export default memo(VicePaymentScreen)
