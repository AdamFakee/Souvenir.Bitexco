import { Button } from '@/shared/components/ui'
import { LogoSkydeck } from '@/shared/components/ui/icons'
import { useAppStore } from '@/shared/features/app'
import { AuthAPI, BG_MAIN } from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { ShieldX } from 'lucide-react-native'
import React, { useState } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'

export default function DeviceLocked() {
  const [loading, setLoading] = useState(false)
  const appService = useAppStore((s) => s.appService)

  const handleCheckAgain = async () => {
    setLoading(true)
    try {
      const deviceContext = await AuthAPI.getDeviceContext()
      if (deviceContext.isActive) {
        appService?.send({ type: 'DEVICE_UNLOCKED' })
      } else {
        toast.error('Thiết bị vẫn chưa được kích hoạt. Vui lòng liên hệ quản trị viên.')
      }
    } catch (e) {
      console.error('[DeviceLocked] Failed to check device context:', e)
      toast.error('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      {/* Teal gradient overlay matching Figma */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Logo top */}
        <LogoSkydeck width={200} height={80} color="#ffffff" />

        {/* White card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <ShieldX size={36} color="#dc2626" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Thiết bị ngưng hoạt động</Text>
              <Text style={styles.cardSubtitle}>
                Thiết bị này đã bị vô hiệu hoá trên hệ thống. Vui lòng liên hệ quản trị viên để được
                hỗ trợ kích hoạt lại.
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info row */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Sau khi quản trị viên kích hoạt lại thiết bị, nhấn{' '}
              <Text style={styles.infoTextBold}>Kiểm tra lại</Text> để tiếp tục sử dụng.
            </Text>
          </View>

          {/* Check again button */}
          <Button label="Kiểm tra lại" onPress={handleCheckAgain} loading={loading} />
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingTop: 24,
  },
  card: {
    width: 608,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e1e2',
    padding: 24,
    gap: 20,
    shadowColor: '#a8a8a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    lineHeight: 38,
    color: '#282929',
  },
  cardSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  infoBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#92400e',
  },
  infoTextBold: {
    fontFamily: 'Manrope-Bold',
    color: '#92400e',
  },
})
