import React from 'react'
import { Text, View } from 'react-native'
import { PieChart } from 'react-native-gifted-charts'
import { formatCurrency } from '@/shared/utils'
import { Shimmer } from '@/shared/components/ui/shimmer'
import { useAppContext } from '@/shared/features/app'
import { useDashboardOverview } from '../hooks'

export function PaymentMethodsPanel() {
  const { cashSessionId } = useAppContext()
  const { overview, isLoading } = useDashboardOverview(cashSessionId ?? undefined)

  if (isLoading || !overview) {
    return (
      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="flex-[1] flex-col items-center rounded-2xl border border-[#e5e7eb]/40 p-6"
      >
        <View className="w-full items-center">
          {/* Header */}
          <View className="w-full flex-row justify-center pb-6">
            <Text className="text-[22px] font-black text-[#111827]">Hình thức thanh toán</Text>
          </View>

          {/* Donut Chart Shimmer */}
          <View className="relative my-2 items-center justify-center">
            <Shimmer
              style={{ borderRadius: 120 }}
              className="h-[240px] w-[240px] items-center justify-center rounded-full"
            >
              {/* Inner Circle Cutout to represent a donut */}
              <View className="h-[170px] w-[170px] items-center justify-center rounded-full bg-white">
                <Shimmer className="h-6 w-28" />
                <Shimmer className="mt-2 h-4 w-16" />
              </View>
            </Shimmer>
          </View>
        </View>

        {/* Legends Section Shimmer */}
        <View className="mt-6 w-full flex-col gap-3">
          {[1, 2, 3].map((idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between rounded-xl border border-[#e5e7eb]/40 bg-white px-4 py-3"
            >
              <View className="flex-row items-center gap-3">
                <Shimmer className="h-3.5 w-3.5 rounded-full" />
                <Shimmer className="h-5 w-24" />
              </View>
              <Shimmer className="h-5 w-24" />
            </View>
          ))}
        </View>
      </View>
    )
  }

  // FE mapping colors and keys based on the API name
  const colorMap: Record<string, string> = {
    'Thẻ tín dụng': '#6366f1',
    'Tiền mặt': '#f97316',
    QR: '#0ea5e9',
  }
  const defaultColors = ['#6366f1', '#f97316', '#0ea5e9', '#ec4899', '#8b5cf6']

  const mappedPaymentMethods = overview.paymentMethods.map((pm, idx) => ({
    ...pm,
    color: colorMap[pm.name] || defaultColors[idx % defaultColors.length],
  }))

  // Pie chart data formatting
  const pieData = mappedPaymentMethods.map((pm) => ({
    value: pm.value,
    color: pm.color,
    text: pm.name,
  }))

  return (
    <View
      style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
      className="flex-[1] flex-col items-center rounded-2xl border border-[#e5e7eb]/40 p-6"
    >
      <View className="w-full items-center">
        {/* Header */}
        <View className="w-full flex-row justify-center pb-6">
          <Text className="text-[22px] font-black text-[#111827]">Hình thức thanh toán</Text>
        </View>

        {/* Graphical Donut Chart */}
        <View className="my-2 items-center justify-center">
          <PieChart
            data={pieData}
            donut
            radius={120}
            innerRadius={85}
            innerCircleColor={'#ffffff'}
            centerLabelComponent={() => {
              const revenueText = formatCurrency(overview.totalRevenue)
              const dynamicSize = revenueText.length > 15 ? 14 : revenueText.length > 11 ? 19 : 28
              return (
                <View className="w-[160px] items-center justify-center bg-white px-2">
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={{ fontSize: dynamicSize, color: '#111827' }}
                    className="text-center font-black"
                  >
                    {revenueText}
                  </Text>
                  <Text className="mt-1.5 text-[15px] font-bold text-[#6b7280]">Tổng cộng</Text>
                </View>
              )
            }}
          />
        </View>
      </View>

      {/* Legends Section */}
      <View className="mt-6 w-full flex-col gap-3">
        {mappedPaymentMethods.map((pm, idx) => (
          <View
            key={idx}
            className="flex-row items-center justify-between rounded-xl border border-[#e5e7eb]/40 bg-white px-4 py-3"
          >
            <View className="flex-row items-center gap-3">
              <View style={{ backgroundColor: pm.color }} className="h-3.5 w-3.5 rounded-full" />
              <Text className="text-[17px] font-extrabold text-[#111827]">{pm.name}</Text>
            </View>
            <Text className="text-[17px] font-extrabold text-[#111827]">
              {formatCurrency(pm.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
