import { Button, Numpad } from '@/shared/components/ui'
import { COLORS, ROUTES } from '@/shared/constants'
import { useAppContext, useAppStore } from '@/shared/features/app'
import { toast, useAlertStore } from '@/shared/store'
import { formatVND } from '@/shared/utils'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Coins, User, LogOut } from 'lucide-react-native'
import React, { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
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
    <View className="flex-1 bg-surface">
      <LinearGradient colors={['#e0f2fe', '#bae6fd']} className="absolute inset-0" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View className="w-full max-w-[600px] rounded-3xl border border-white/20 bg-white p-8 shadow-2xl">
          {/* Header User Info */}
          <View className="mb-8 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <User size={28} color={COLORS.secondary.default} />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  {employee?.displayName || 'Nhân viên'}
                </Text>
                <Text className="text-sm text-slate-500">
                  Mã NV: {employee?.employeeCode || 'N/A'}
                </Text>
              </View>
            </View>

            <Button
              label="Đổi tài khoản"
              variant="outline"
              leftIcon={LogOut}
              className="h-10 rounded-xl border-slate-200 px-4"
              textClassName="text-slate-600 text-xs font-semibold"
              onPress={handleLogout}
            />
          </View>

          {/* Main Open Shift Box */}
          <View className="mb-6">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              TIỀN MẶT ĐẦU CA
            </Text>
            <View className="mb-2 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Coins size={24} color="#059669" />
              <Text className="flex-1 px-2 text-right text-3xl font-black tracking-tight text-slate-900">
                {formatVND(Number(amountStr || '0'))}
              </Text>
            </View>
            <Text className="mt-1 text-center text-sm font-medium text-amber-600">
              Kiểm tra số lượng tiền mặt hiện có trước khi bắt đầu ca làm
            </Text>
          </View>

          {/* Virtual POS Keyboard */}
          <View className="w-full flex-row items-center justify-center">
            <Numpad
              onPress={(digit) => handleKeyPress(digit)}
              onBackspace={() => handleKeyPress('BACK')}
              onClear={() => handleKeyPress('CLEAR')}
              className="mb-6 w-[50%]"
            />
          </View>

          {/* Open Shift Action Button */}
          <Button
            label="MỞ CA LÀM VIỆC"
            className="h-16 rounded-2xl border-emerald-600 bg-emerald-600 active:opacity-90"
            textClassName="text-white font-bold text-lg tracking-wide"
            onPress={handleOpenShift}
            loading={isLoading}
            disabled={!amountStr || amountStr === '0'}
          />
        </View>
      </ScrollView>
    </View>
  )
}
