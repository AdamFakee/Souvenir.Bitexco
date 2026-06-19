import { Shimmer } from '@/shared/components/ui'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

const QRCODE_SIZE = 220

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[280px] gap-2 rounded-xl bg-white px-3 py-3">
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

          <View className="h-px w-full bg-slate-200" />

          {/* Amount info */}
          <View className="w-full flex-row items-center justify-center">
            <Text style={styles.totalLabel}>
              Total: <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
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
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    includeFontPadding: false,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#ff5c00',
    includeFontPadding: false,
  },
})

export default memo(VicePaymentScreen)
