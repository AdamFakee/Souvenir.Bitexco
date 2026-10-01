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
      className="flex-row items-center border-t px-6 py-5"
      style={{ borderColor: '#DFE0E1', backgroundColor: '#FAFAFB' }}
    >
      <View className="flex-row items-center gap-6">
        <View className="flex-row items-baseline gap-2">
          <Text
            className="uppercase tracking-wide"
            style={{ color: '#747475', fontFamily: 'Manrope-Bold', fontSize: 20 }}
          >
            Tổng đơn
          </Text>
          <Text
            className="font-black tabular-nums"
            style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 24 }}
          >
            {stats.count}
          </Text>
        </View>

        <View className="h-6 w-px" style={{ backgroundColor: '#DFE0E1' }} />

        <View className="flex-row items-baseline gap-2">
          <Text
            className="uppercase tracking-wide"
            style={{ color: '#747475', fontFamily: 'Manrope-Bold', fontSize: 20 }}
          >
            Sản phẩm
          </Text>
          <Text
            className="font-black tabular-nums"
            style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 24 }}
          >
            {stats.totalItems}
          </Text>
        </View>
      </View>

      <View className="flex-1" />

      <View className="flex-row items-baseline gap-2">
        <Text
          className="uppercase tracking-wide"
          style={{ color: '#747475', fontFamily: 'Manrope-Bold', fontSize: 20 }}
        >
          Tổng doanh thu
        </Text>
        <Text
          className="font-black tabular-nums"
          style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 28 }}
        >
          {formatCurrency(stats.totalRevenue)}
        </Text>
      </View>
    </View>
  )
})
