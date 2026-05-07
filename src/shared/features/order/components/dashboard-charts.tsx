import React from 'react'
import { Text, View } from 'react-native'
import { BarChart, PieChart } from 'react-native-gifted-charts'

interface DashboardChartsProps {
  topProducts: { name: string; qty: number; stock: number }[]
  paymentMethodsData: { name: string; value: number; color: string }[]
}

export function DashboardCharts({ topProducts, paymentMethodsData }: DashboardChartsProps) {
  // Format Bar Data
  const barData = topProducts.map((p, index) => ({
    value: p.qty,
    label: p.name,
    stock: p.stock,
    index,
    frontColor: '#3b82f6',
  }))

  // Format Pie Data
  const pieData = paymentMethodsData.map((d) => ({
    value: d.value,
    color: d.color,
    text: d.name,
  }))

  return (
    <View className="flex-row gap-8">
      {/* Top Products Bar Chart */}
      <View
        style={{ backgroundColor: '#ffffff', zIndex: 10, overflow: 'visible' }}
        className="flex-1 rounded-[32px] border border-outline-variant p-10 shadow-sm"
      >
        <Text className="mb-8 text-2xl font-black uppercase tracking-widest text-surface-on-variant">
          Top 5 Best-Selling Products
        </Text>
        <View style={{ overflow: 'visible' }} className="z-10 items-center">
          {barData.length > 0 ? (
            <BarChart
              data={barData}
              barWidth={80}
              spacing={40}
              initialSpacing={30}
              height={300}
              overflowTop={100}
              maxValue={Math.max(...barData.map((d) => d.value), 5) + 2}
              noOfSections={4}
              barBorderRadius={8}
              frontColor="#3b82f6"
              showValuesAsTopLabel
              topLabelTextStyle={{ color: '#3b82f6', fontSize: 16, fontWeight: 'bold' }}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="#cbd5e1"
              hideRules
              rotateLabel
              labelsExtraHeight={150}
              labelsDistanceFromXaxis={30}
              xAxisLabelTextStyle={{
                color: '#475569',
                fontSize: 14,
                fontWeight: '600',
                transform: [{ rotate: '-45deg' }],
                width: 120,
                textAlign: 'right',
                marginRight: 40,
              }}
              focusBarOnPress={true}
              activeOpacity={0.7}
              renderTooltip={(item: any) => {
                const isFirst = item.index === 0
                const isLast = item.index === barData.length - 1
                // Dynamic positioning to prevent edge clipping
                let leftPos = -70
                if (isFirst) leftPos = 0
                else if (isLast) leftPos = -200

                const bottomPos = -80

                return (
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      padding: 16,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      width: 240,
                      position: 'absolute',
                      bottom: bottomPos,
                      left: leftPos,
                      shadowColor: '#64748b',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.2,
                      shadowRadius: 16,
                      elevation: 12,
                      zIndex: 9999,
                    }}
                  >
                    <Text className="mb-3 text-base font-black text-slate-900" numberOfLines={2}>
                      {item.label}
                    </Text>
                    <View className="flex-row justify-between border-b border-slate-100 pb-2">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Số lượng bán
                      </Text>
                      <Text className="text-lg font-black text-blue-600">{item.value}</Text>
                    </View>
                    <View className="mt-2 flex-row justify-between">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Tồn kho hiện tại
                      </Text>
                      <Text className="text-base font-extrabold text-orange-600">{item.stock}</Text>
                    </View>
                  </View>
                )
              }}
              leftShiftForTooltip={0}
              autoCenterTooltip={true}
            />
          ) : (
            <View className="h-[200px] items-center justify-center">
              <Text className="text-surface-on-variant">No data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Payment Breakdown Pie Chart */}
      <View
        style={{ backgroundColor: '#ffffff', zIndex: 1 }}
        className="flex-1 rounded-[32px] border border-outline-variant p-10 shadow-sm"
      >
        <Text className="mb-8 text-2xl font-black uppercase tracking-widest text-surface-on-variant">
          Payment Breakdown
        </Text>
        <View className="items-center">
          {pieData.length > 0 ? (
            <View className="items-center gap-10">
              <PieChart
                data={pieData}
                donut
                radius={120}
                innerRadius={80}
                innerCircleColor={'white'}
                centerLabelComponent={() => {
                  return <Text className="text-xl font-bold text-surface-on">Methods</Text>
                }}
              />
              <View className="w-full flex-row flex-wrap justify-center gap-x-10 gap-y-4 px-4">
                {paymentMethodsData.map((d, index) => (
                  <View key={index} className="flex-row items-center gap-3">
                    <View style={{ backgroundColor: d.color }} className="h-4 w-4 rounded-full" />
                    <Text className="text-lg font-bold text-surface-on-variant">{d.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="h-[200px] items-center justify-center">
              <Text className="text-surface-on-variant">No data available</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
