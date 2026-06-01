import { Button, Numpad } from '@/shared/components/ui'
import { LogoSkydeck } from '@/shared/components/ui/icons'
import { COLORS, ROUTES } from '@/shared/constants'
import { useAppContext, useAppStore } from '@/shared/features/app'
import { BG_MAIN } from '@/shared/features/auth'
import { toast, useAlertStore } from '@/shared/store'
import { formatVND } from '@/shared/utils'
import { useRouter } from 'expo-router'
import { Coins, LogOut, User } from 'lucide-react-native'
import React, { useState } from 'react'
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useOpenStaffShift } from '../../shared/features/shift'

export default function OpenShift() {
  const router = useRouter()
  const { employee, device } = useAppContext()
  const [amountStr, setAmountStr] = useState('')

  const { openStaffShift, isLoading } = useOpenStaffShift()
  const { confirm } = useAlertStore()

  const handleKeyPress = React.useCallback((key: 'CLEAR' | 'BACK' | '000' | string) => {
    setAmountStr((prev) => {
      if (key === 'CLEAR') {
        return ''
      }
      if (key === 'BACK') {
        return prev.slice(0, -1)
      }
      if (key === '000') {
        if (prev.length > 0 && prev.length < 12) {
          return prev + '000'
        }
        return prev
      }
      if (prev.length < 12) {
        return prev + key
      }
      return prev
    })
  }, [])

  const handleOpenShift = async () => {
    const deviceId = device?.id
    if (!deviceId) {
      toast.error('Không tìm thấy thông tin thiết bị')
      return
    }

    if (!employee?.id) {
      toast.error('Không tìm thấy thông tin nhân viên')
      router.replace(ROUTES.STAFF_LOGIN.path())
      return
    }

    if (Number(amountStr || '0') === 0) {
      toast.error('Số tiền mặt đầu ca phải lớn hơn 0')
      return
    }

    confirm({
      title: 'Xác nhận mở ca',
      message: `Bạn có chắc chắn muốn mở ca làm việc với số tiền ${formatVND(Number(amountStr || '0'))} không?`,
      onConfirm: async () => {
        try {
          await openStaffShift({
            posDeviceId: deviceId,
            openingBalance: Number(amountStr || '0'),
          })
          toast.success('Mở ca làm việc thành công')
        } catch {
          toast.error('Có lỗi xảy ra khi mở ca làm việc')
        }
      },
    })
  }

  const handleLogout = () => {
    confirm({
      title: 'Đăng xuất tài khoản',
      message: 'Bạn có chắc chắn muốn đăng xuất và đổi nhân viên khác không?',
      onConfirm: () => {
        // Tránh lỗi native crash trên Android khi unmount screen khi Modal Alert chưa kịp đóng hoàn toàn
        setTimeout(() => {
          const appService = useAppStore.getState().appService
          if (appService) {
            appService.send({ type: 'LOGGED_OUT' })
            toast.success('Đã đăng xuất nhân viên')
          } else {
            toast.error('App Service chưa sẵn sàng')
          }
        }, 150)
      },
    })
  }

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      {/* Teal overlay matching Figma */}
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <LogoSkydeck width={200} height={80} color="#ffffff" />

        {/* White card */}
        <View style={styles.card}>
          {/* Header — Employee info + Logout */}
          <View style={styles.cardHeader}>
            <View style={styles.employeeInfo}>
              <View style={styles.avatarCircle}>
                <User size={26} color={COLORS.secondary.default} />
              </View>
              <View>
                <Text style={styles.employeeName}>{employee?.displayName || 'Nhân viên'}</Text>
                <Text style={styles.employeeCode}>Mã NV: {employee?.employeeCode || 'N/A'}</Text>
              </View>
            </View>

            <Button
              label="Đổi tài khoản"
              variant="outline"
              leftIcon={LogOut}
              iconSize={16}
              className="h-10 rounded-xl border-[#e0e1e2] px-4"
              textClassName="text-[#4b5563] text-xs font-semibold"
              onPress={handleLogout}
            />
          </View>

          {/* Cash amount display */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>TIỀN MẶT ĐẦU CA</Text>
            <View style={styles.amountBox}>
              <Coins size={24} color={COLORS.secondary.default} />
              <Text style={styles.amountText} numberOfLines={1} adjustsFontSizeToFit>
                {formatVND(Number(amountStr || '0'))}
              </Text>
            </View>
            <Text style={styles.amountHint}>
              Kiểm tra số lượng tiền mặt hiện có trước khi bắt đầu ca làm
            </Text>
          </View>

          {/* Numpad */}
          <View style={styles.numpadRow}>
            <Numpad
              onPress={(digit) => handleKeyPress(digit)}
              onBackspace={() => handleKeyPress('BACK')}
              onClear={() => handleKeyPress('CLEAR')}
              className="w-[52%]"
            />
          </View>

          {/* Open shift button */}
          <Button
            label="MỞ CA LÀM VIỆC"
            onPress={handleOpenShift}
            loading={isLoading}
            disabled={!amountStr || amountStr === '0'}
          />
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingVertical: 32,
    paddingHorizontal: 20,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#111827',
  },
  employeeCode: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  amountSection: {
    gap: 8,
  },
  amountLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  amountText: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  amountHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#d97706',
    textAlign: 'center',
  },
  numpadRow: {
    alignItems: 'center',
  },
})
