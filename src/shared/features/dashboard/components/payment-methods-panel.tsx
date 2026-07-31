import { Shimmer } from '@/shared/components/ui/shimmer'
import {
  PAYMENT_CHART_COLORS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodCode,
} from '@/shared/features/payment/types/payment.constants'
import { formatCurrency } from '@/shared/utils'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import type { DashboardOverviewResponse } from '../types'

// Chart lib nặng — import động sau first paint
let PieChart: React.ComponentType<any> | null = null

interface PaymentMethodsPanelProps {
  overview: DashboardOverviewResponse | null
  isLoading: boolean
}

function ChartSkeleton() {
  return (
    <View className="relative my-2 items-center justify-center">
      <Shimmer
        style={{ borderRadius: 144 }}
        className="h-[288px] w-[288px] items-center justify-center rounded-full"
      >
        <View className="h-[204px] w-[204px] items-center justify-center rounded-full bg-white">
          <Shimmer className="w-34 h-7" />
          <Shimmer className="mt-2 h-5 w-20" />
        </View>
      </Shimmer>
    </View>
  )
}

export const PaymentMethodsPanel = memo(function PaymentMethodsPanel({
  overview,
  isLoading,
}: PaymentMethodsPanelProps) {
  const [chartReady, setChartReady] = useState(!!PieChart)

  useEffect(() => {
    if (PieChart) {
      setChartReady(true)
      return
    }
    let cancelled = false
    // Defer module eval — không block first paint tab báo cáo
    const id = requestAnimationFrame(() => {
      import('react-native-gifted-charts')
        .then((mod) => {
          if (cancelled) return
          PieChart = mod.PieChart
          setChartReady(true)
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [])

  const mapped = useMemo(() => {
    if (!overview?.paymentMethods) return []
    const defaultColors = ['#6366f1', '#f97316', '#0ea5e9', '#ec4899', '#8b5cf6']
    return overview.paymentMethods
      .filter((pm) => {
        const method = (pm.method || pm.name || '').toLowerCase()
        return method !== 'exchange'
      })
      .map((pm, idx) => {
        const rawName = pm.name || pm.method || ''
        const rawValue = pm.value !== undefined ? pm.value : pm.amount !== undefined ? pm.amount : 0
        const code = rawName.toLowerCase() as PaymentMethodCode
        return {
          name: PAYMENT_METHOD_LABELS[code] || rawName,
          value: rawValue,
          color: PAYMENT_CHART_COLORS[code] || defaultColors[idx % defaultColors.length],
        }
      })
  }, [overview])

  const pieData = useMemo(
    () => mapped.map((pm) => ({ value: pm.value, color: pm.color, text: pm.name })),
    [mapped],
  )

  if (isLoading) {
    return (
      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="flex-[1] flex-col items-center rounded-2xl border border-[#e5e7eb]/40 p-7"
      >
        <View className="w-full items-center">
          <View className="w-full flex-row justify-center pb-6">
            <Text className="text-[26px] font-black text-[#111827]">Hình thức thanh toán</Text>
          </View>
          <ChartSkeleton />
        </View>
        <View className="mt-6 w-full flex-col gap-3">
          {[1, 2, 3].map((idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between rounded-xl border border-[#e5e7eb]/40 bg-white px-5 py-4"
            >
              <View className="flex-row items-center gap-3">
                <Shimmer className="h-4.5 w-4.5 rounded-full" />
                <Shimmer className="w-30 h-6" />
              </View>
              <Shimmer className="w-30 h-6" />
            </View>
          ))}
        </View>
      </View>
    )
  }

  if (!overview) return null

  const revenueText = formatCurrency(overview.totalRevenue)
  const dynamicSize = revenueText.length > 15 ? 17 : revenueText.length > 11 ? 23 : 34
  const Chart = PieChart

  return (
    <View
      style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
      className="flex-[1] flex-col items-center rounded-2xl border border-[#e5e7eb]/40 p-7"
    >
      <View className="w-full items-center">
        <View className="w-full flex-row justify-center pb-6">
          <Text className="text-[26px] font-black text-[#111827]">Hình thức thanh toán</Text>
        </View>

        <View className="my-2 items-center justify-center">
          {chartReady && Chart ? (
            <Chart
              data={pieData}
              donut
              radius={144}
              innerRadius={102}
              innerCircleColor="#ffffff"
              centerLabelComponent={() => (
                <View className="w-[192px] items-center justify-center bg-white px-2">
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={{ fontSize: dynamicSize, color: '#111827' }}
                    className="text-center font-black"
                  >
                    {revenueText}
                  </Text>
                  <Text className="mt-1.5 text-[18px] font-bold text-[#6b7280]">Tổng cộng</Text>
                </View>
              )}
            />
          ) : (
            <ChartSkeleton />
          )}
        </View>
      </View>

      <View className="mt-6 w-full flex-col gap-3">
        {mapped.map((pm, idx) => (
          <View
            key={`${pm.name}-${idx}`}
            className="flex-row items-center justify-between rounded-xl border border-[#e5e7eb]/40 bg-white px-5 py-4"
          >
            <View className="flex-row items-center gap-3">
              <View style={{ backgroundColor: pm.color }} className="h-4.5 w-4.5 rounded-full" />
              <Text className="text-[20px] font-extrabold text-[#111827]">{pm.name}</Text>
            </View>
            <Text className="text-[20px] font-extrabold text-[#111827]">
              {formatCurrency(pm.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
})
