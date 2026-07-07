import { EmptyState, IconButton, QuantityStepper } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { PackageSearch, Trash2 } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import {
  calculateExchangeReplacementVat,
  ExchangeReplacementLine,
} from '../machines/exchange-order.machine'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BRAND = '#1C4E68'

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
          <View
            className="flex-row items-center px-5 py-4"
            style={{ borderBottomWidth: 0.5, borderColor: BORDER }}
          >
            <View className="flex-1 pr-3">
              <Text
                className="text-lg font-extrabold"
                style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                numberOfLines={1}
              >
                {line.name}
              </Text>
              <Text
                className="mt-0.5 text-sm font-bold"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                numberOfLines={1}
              >
                {line.sku}
              </Text>
            </View>

            <View className="w-36 items-center">
              <QuantityStepper
                value={line.qty}
                onChange={(qty) => onChangeQty(line.variantId, qty)}
                disabled={!isDraft || isProcessing}
                max={line.stock > 0 ? line.stock : undefined}
                editable={true}
              />
            </View>

            <Text
              className="w-28 text-right text-lg font-extrabold"
              style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
              numberOfLines={1}
            >
              {formatCurrency(lineTotal)}
            </Text>

            <IconButton
              icon={Trash2}
              size={20}
              color="#DC2626"
              className="ml-2 bg-transparent opacity-70"
              onPress={() => onRemoveItem(line.variantId)}
              disabled={!isDraft || isProcessing}
            />
          </View>
        )
      }}
    />
  )
})
