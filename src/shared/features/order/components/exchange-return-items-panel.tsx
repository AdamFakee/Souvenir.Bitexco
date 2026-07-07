import { Checkbox, QuantityStepper } from '@/shared/components/ui'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import React, { memo, useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'

interface ExchangeReturnItemsPanelProps {
  items: ItemSnapshot[]
  isDraft: boolean
  isProcessing: boolean
  getLineQty: (productId: string) => number
  getLineAmount: (item: ItemSnapshot, qty: number) => number
  onToggleItem: (item: ItemSnapshot) => void
  onChangeQty: (item: ItemSnapshot, qty: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export const ExchangeReturnItemsPanel = memo(function ExchangeReturnItemsPanel({
  items,
  isDraft,
  isProcessing,
  getLineQty,
  getLineAmount,
  onToggleItem,
  onChangeQty,
  onSelectAll,
  onClearAll,
}: ExchangeReturnItemsPanelProps) {
  const allSelected = useMemo(() => {
    if (!items || items.length === 0) return false
    return items.every((item) => getLineQty(item.productId) > 0)
  }, [items, getLineQty])

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      onClearAll()
    } else {
      onSelectAll()
    }
  }, [allSelected, onSelectAll, onClearAll])

  return (
    <View className="flex-1 bg-white">
      {/* Section header */}
      <View
        className="flex-row items-center px-5 py-3"
        style={{ borderBottomWidth: 1, borderColor: BORDER, backgroundColor: '#FAFAFB' }}
      >
        <Text
          className="text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          Hàng khách trả
        </Text>
      </View>

      {/* Column header */}
      <View
        className="flex-row items-center px-5 py-3"
        style={{ borderBottomWidth: 1, borderColor: BORDER }}
      >
        <View className="w-12 items-center justify-center">
          <Checkbox
            checked={allSelected}
            onChange={handleToggleAll}
            disabled={!isDraft || isProcessing}
          />
        </View>
        <Text
          className="ml-4 flex-1 text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          Sản phẩm
        </Text>
        <Text
          className="w-20 text-center text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          SL mua
        </Text>
        <Text
          className="w-36 text-center text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          SL trả
        </Text>
        <Text
          className="w-28 text-right text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          Giá trị
        </Text>
      </View>

      <FlashList<ItemSnapshot>
        data={items}
        keyExtractor={(item, index) => item.productId || index.toString()}
        renderItem={({ item }) => {
          const qty = getLineQty(item.productId)
          const isSelected = qty > 0
          const lineAmount = getLineAmount(item, qty)

          return (
            <View
              className="flex-row items-center px-5 py-4"
              style={{ borderBottomWidth: 0.5, borderColor: BORDER }}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleItem(item)}
                disabled={!isDraft || isProcessing}
              />
              <View className="ml-4 flex-1">
                <Text
                  className="text-lg font-extrabold"
                  style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  className="mt-0.5 text-sm font-bold"
                  style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                  numberOfLines={1}
                >
                  {item.sku}
                </Text>
              </View>
              <Text
                className="w-20 text-center text-lg font-extrabold"
                style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
              >
                x{item.quantity}
              </Text>
              <View className="w-36 items-center">
                <QuantityStepper
                  value={qty}
                  onChange={(nextQty) => onChangeQty(item, nextQty)}
                  disabled={!isDraft || isProcessing}
                  max={item.quantity}
                  editable={true}
                />
              </View>
              <Text
                className="w-28 text-right text-lg font-extrabold"
                style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                numberOfLines={1}
              >
                {isSelected ? formatCurrency(lineAmount) : '-'}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
})
