import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { Banknote } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

const CashCard = memo(function CashCard({
  label,
  value,
  isHighlight = false,
}: {
  label: string
  value: number
  isHighlight?: boolean
}) {
  return (
    <View
      className={`flex-1 items-center justify-center rounded-[20px] border p-6 shadow-sm ${
        isHighlight ? 'border-outline-variant bg-surface-100' : 'border-surface-200 bg-surface-50'
      }`}
    >
      <Text
        className={`text-center font-sans text-xl font-black uppercase tracking-wider ${
          isHighlight ? 'text-primary' : 'text-surface-on-variant'
        }`}
      >
        {label}
      </Text>
      <Text
        className={`text-center font-sans font-black ${
          isHighlight ? 'text-4xl text-primary' : 'text-3xl text-surface-on'
        }`}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  )
})

const Row = memo(function Row({
  label,
  value,
  isHighlight = false,
  prefix = '',
}: {
  label: string
  value: number
  isHighlight?: boolean
  prefix?: string
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={`font-sans text-2xl font-bold ${
          isHighlight ? 'text-primary' : 'text-surface-on-variant'
        }`}
      >
        {label}
      </Text>
      <Text
        className={`font-sans text-2xl font-black ${
          isHighlight ? 'text-primary' : 'text-surface-on'
        }`}
      >
        {prefix}
        {formatCurrency(value)}
      </Text>
    </View>
  )
})

function ViceCashPaymentScreen() {
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)
  const customerPaid = useViceStore((state) => state.customerPaid)
  const change = useViceStore((state) => state.change)

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="w-full rounded-[32px] border border-surface-200 bg-white p-10 shadow-xl">
        {/* Header: Cực kỳ to và rõ ràng */}
        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Banknote size={44} color={COLORS?.primary?.default || '#4f46e5'} />
          </View>
          <Text className="text-center font-sans text-3xl font-black uppercase tracking-wider text-surface-on">
            Thanh toán tiền mặt
          </Text>
          <Text className="mt-2 text-center font-sans text-base font-semibold text-surface-on-variant">
            Quý khách vui lòng kiểm tra thông tin giao dịch bên dưới
          </Text>
        </View>

        <View className="mb-8 border-b-2 border-surface-200 pb-2" />

        {/* Dashboard Tiền: Cực kỳ lớn và căn giữa hoàn hảo */}
        <View className="mb-8 flex-row gap-5">
          <CashCard label="Tổng hóa đơn" value={total} />
          <CashCard label="Khách hàng đưa" value={customerPaid} />
          <CashCard label="Tiền thối dự kiến" value={change} isHighlight />
        </View>

        {/* Chi tiết breakdown hóa đơn: Chữ to rõ nét */}
        <View className="gap-4 rounded-[20px] border border-dashed border-outline-variant bg-surface-100 p-6">
          <Row label="Tạm tính" value={subtotal} />
          {discount > 0 && <Row label="Giảm giá" value={discount} prefix="-" isHighlight />}
          <Row label="Thuế" value={tax} />
        </View>
      </View>
    </View>
  )
}

export default memo(ViceCashPaymentScreen)
