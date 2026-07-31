import { Shimmer } from '@/shared/components/ui'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

const QRCODE_SIZE = 286

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[380px] rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl">
          {/* QR Code Container */}
          <View className="w-full items-center justify-center rounded-lg bg-white p-2">
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
              <Shimmer className="rounded-lg" style={{ width: QRCODE_SIZE, height: QRCODE_SIZE }} />
            )}
          </View>

          <View className="my-5 h-px w-full bg-slate-100" />

          {/* Amount info */}
          <View className="w-full flex-row items-center justify-center py-1.5">
            <Text
              className="text-center text-[31px] font-bold leading-[50px] text-slate-900"
              style={{ textAlignVertical: 'center', includeFontPadding: false }}
            >
              Total:{' '}
              <Text
                className="text-[42px] font-extrabold text-[#ff5c00]"
                style={{ includeFontPadding: false }}
              >
                {formatCurrency(total)}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
  totalLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    includeFontPadding: false,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ff5c00',
    includeFontPadding: false,
  },
})

export default memo(VicePaymentScreen)
