import { Button, Numpad } from '@/shared/components/ui'
import { COLORS, ROUTES } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import { useIsOnline } from '@/shared/hooks'
import { toast, useAlertStore } from '@/shared/store'
import { formatVND } from '@/shared/utils'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Coins, Monitor, Printer, User, Wifi } from 'lucide-react-native'
import React, { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useOpenStaffShift } from '../../shared/features/shift'

export default function OpenShift() {
  const router = useRouter()
  const { currentStaff } = useAuthStore()
  const [amountStr, setAmountStr] = useState('')
  const isOnline = useIsOnline()
  const [isPrinterReady, setIsPrinterReady] = useState(true)
  const [isViceScreenReady, setIsViceScreenReady] = useState(true)

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
    if (!currentStaff?.id) {
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
            staffId: currentStaff.id,
            openingBalance: Number(amountStr || '0'),
          })
          toast.success('Mở ca làm việc thành công')
        } catch {
          toast.error('Có lỗi xảy ra khi mở ca làm việc')
        }
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
                  {currentStaff?.fullname || 'Nhân viên'}
                </Text>
                <Text className="text-sm text-slate-500">Mã NV: {currentStaff?.id || 'N/A'}</Text>
              </View>
            </View>
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

          {/* Footer Status Bar */}
          <View className="mt-6 flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
            <View className="flex-row items-center gap-2">
              <Printer
                size={16}
                color={isPrinterReady ? COLORS.primary.default : COLORS.error.default}
              />
              <Text
                className={`text-xs font-medium ${isPrinterReady ? 'text-primary' : 'text-error'}`}
              >
                Máy in
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Monitor
                size={16}
                color={isViceScreenReady ? COLORS.primary.default : COLORS.error.default}
              />
              <Text
                className={`text-xs font-medium ${isViceScreenReady ? 'text-primary' : 'text-error'}`}
              >
                Màn phụ
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Wifi size={16} color={isOnline ? COLORS.primary.default : COLORS.error.default} />
              <Text className={`text-xs font-medium ${isOnline ? 'text-primary' : 'text-error'}`}>
                Mạng
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
