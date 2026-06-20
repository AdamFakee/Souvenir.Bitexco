import { EmptyState, IconButton, QuantityStepper } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { PackageSearch, Trash2 } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import {
  calculateExchangeReplacementVat,
  ExchangeReplacementLine,
} from '../machines/exchange-order.machine'

interface ExchangeReplacementItemsListProps {
  lines: ExchangeReplacementLine[]
  isDraft: boolean
  isProcessing: boolean
  onChangeQty: (variantId: string, qty: number) => void
  onRemoveItem: (variantId: string) => void
}

export const ExchangeReplacementItemsList = memo(function ExchangeReplacementItemsList({
  lines,
  isDraft,
  isProcessing,
  onChangeQty,
  onRemoveItem,
}: ExchangeReplacementItemsListProps) {
  return (
    <FlashList
      data={lines}
      keyExtractor={(line) => line.variantId}
      showsVerticalScrollIndicator={true}
      ListEmptyComponent={() => (
        <EmptyState
          title="Chưa có hàng đổi mới"
          description="Tìm kiếm hoặc quét mã để thêm sản phẩm khách muốn đổi."
          icon={PackageSearch}
          className="py-16"
        />
      )}
      renderItem={({ item: line }) => {
        const lineSubtotal = line.price * line.qty
        const lineVat = calculateExchangeReplacementVat([line])
        const lineTotal = lineSubtotal + lineVat

        return (
          <View className="flex-row items-center border-b border-outline-variant px-8 py-5">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
                {line.name}
              </Text>
              <Text className="mt-1 text-xs font-bold text-muted/60" numberOfLines={1}>
                {line.sku}
              </Text>
            </View>

            <View className="w-40 items-center">
              <QuantityStepper
                value={line.qty}
                onChange={(qty) => onChangeQty(line.variantId, qty)}
                disabled={!isDraft || isProcessing}
                max={line.stock > 0 ? line.stock : undefined}
                editable={true}
              />
            </View>

            <Text className="w-36 text-right text-xl font-black text-primary" numberOfLines={1}>
              {formatCurrency(lineTotal)}
            </Text>

            <IconButton
              icon={Trash2}
              size={20}
              color={COLORS.error.default}
              className="ml-2 bg-transparent opacity-60"
              onPress={() => onRemoveItem(line.variantId)}
              disabled={!isDraft || isProcessing}
            />
          </View>
        )
      }}
    />
  )
})
