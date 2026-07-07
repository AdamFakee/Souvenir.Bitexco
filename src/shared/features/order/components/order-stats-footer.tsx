import { formatCurrency } from '@/shared/utils'
import { memo } from 'react'
import { Text, View } from 'react-native'

interface OrderStats {
  totalRevenue: number
  totalItems: number
  count: number
}

interface OrderStatsFooterProps {
  stats: OrderStats
}

const BRAND = '#1C4E68'

export const OrderStatsFooter = memo(function OrderStatsFooter({ stats }: OrderStatsFooterProps) {
  return (
    <View
      className="flex-row items-center border-t px-6 py-3"
      style={{ borderColor: '#DFE0E1', backgroundColor: '#FAFAFB' }}
    >
      <View className="flex-row items-center gap-6">
        <View className="flex-row items-baseline gap-2">
          <Text
            className="text-base font-bold uppercase tracking-wide"
            style={{ color: '#747475', fontFamily: 'Manrope-Bold' }}
          >
            Tổng đơn
          </Text>
          <Text
            className="text-xl font-extrabold tabular-nums"
            style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
          >
            {stats.count}
          </Text>
        </View>

        <View className="h-5 w-px" style={{ backgroundColor: '#DFE0E1' }} />

        <View className="flex-row items-baseline gap-2">
          <Text
            className="text-base font-bold uppercase tracking-wide"
            style={{ color: '#747475', fontFamily: 'Manrope-Bold' }}
          >
            Sản phẩm
          </Text>
          <Text
            className="text-xl font-extrabold tabular-nums"
            style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
          >
            {stats.totalItems}
          </Text>
        </View>
      </View>

      <View className="flex-1" />

      <View className="flex-row items-baseline gap-2">
        <Text
          className="text-base font-bold uppercase tracking-wide"
          style={{ color: '#747475', fontFamily: 'Manrope-Bold' }}
        >
          Tổng doanh thu
        </Text>
        <Text
          className="text-2xl font-extrabold tabular-nums"
          style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
        >
          {formatCurrency(stats.totalRevenue)}
        </Text>
      </View>
    </View>
  )
})
