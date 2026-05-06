import { Button, LoadingIndicator } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import {
  CloseShiftModal,
  CloseShiftModalRef,
  StatCard,
  useObserveActiveShift,
} from '@/shared/features/shift'
import { formatCurrency } from '@/shared/utils'
import { Banknote, QrCode, ReceiptText, Wallet } from 'lucide-react-native'
import React, { useRef } from 'react'
import { ScrollView, Text, View } from 'react-native'

export default function ShiftScreen() {
  const { session } = useAuthStore()
  const { shift, isLoading } = useObserveActiveShift(session?.shiftId)
  const closeShiftModalRef = useRef<CloseShiftModalRef>(null)

  if (isLoading || !shift) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <LoadingIndicator />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface-100">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 40, paddingBottom: 120 }}>
        <View className="mb-14 flex-row items-center justify-between">
          <View>
            <Text className="text-[64px] font-black leading-[72px] tracking-tighter text-surface-on">
              Báo cáo ca làm việc
            </Text>
            <Text className="mt-4 text-3xl font-medium text-surface-on-variant">
              Thống kê doanh thu và hoạt động trong phiên làm việc hiện tại
            </Text>
          </View>
        </View>

        {/* Thống kê chính */}
        <View className="mb-10 flex-row gap-8">
          <StatCard
            label="Tiền mặt đầu ca"
            value={formatCurrency(shift.startingCash)}
            icon={Banknote}
            color={COLORS.primary.default}
            description="Số tiền khởi tạo két"
          />
          <StatCard
            label="Doanh thu tiền mặt"
            value={formatCurrency(shift.cashRevenue)}
            icon={Wallet}
            color={COLORS.primary.default}
            description="Tổng thu tiền mặt"
          />
          <StatCard
            label="Doanh thu QRCode"
            value={formatCurrency(shift.qrRevenue)}
            icon={QrCode}
            color={COLORS.tertiary.default}
            description="Tổng thu qua mã QR"
          />
          <StatCard
            label="Số đơn đã bán"
            value={shift.totalOrders.toString()}
            icon={ReceiptText}
            color={COLORS.secondary.default}
            description="Tổng số hóa đơn"
          />
        </View>

        {/* Tổng kết tiền mặt */}
        <View className="flex-row gap-10">
          <View className="flex-1 rounded-[40px] border border-outline-variant bg-surface-50 p-10 shadow-sm">
            <View className="mb-8 flex-row items-center justify-between">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
                <Banknote size={44} color={COLORS.primary.default} />
              </View>
              <View className="rounded-full bg-primary/10 px-6 py-2">
                <Text className="text-xl font-black uppercase text-primary">Dự kiến</Text>
              </View>
            </View>

            <Text className="text-title-md font-bold text-surface-on-variant">
              Tổng tiền mặt trong két
            </Text>
            <Text className="mt-2 text-7xl font-black tracking-tighter text-primary">
              {formatCurrency(shift.expectedEndingCash)}
            </Text>

            <View className="mt-10 border-t border-dashed border-outline-variant pt-8">
              <View className="mb-4 flex-row justify-between">
                <Text className="text-title-sm text-surface-on-variant">Tiền đầu ca:</Text>
                <Text className="text-title-sm font-black text-surface-on">
                  {formatCurrency(shift.startingCash)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-title-sm text-surface-on-variant">Doanh thu mặt:</Text>
                <Text className="text-title-sm font-black text-surface-on">
                  + {formatCurrency(shift.cashRevenue)}
                </Text>
              </View>
            </View>
          </View>

          <Button
            label="Kết thúc ca làm việc"
            variant="error"
            className="aspect-[16/7] w-[20%] self-center"
            textClassName="font-black text-xl"
            onPress={() => closeShiftModalRef.current?.open()}
          />
        </View>
      </ScrollView>

      <CloseShiftModal ref={closeShiftModalRef} shift={shift} />
    </View>
  )
}
