import { Button, IconButton, QuantityStepper } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useSelector } from '@xstate/react'
import { Plus, ShoppingBasket, Trash2, X } from 'lucide-react-native'
import React, { useMemo, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ActorRefFrom } from 'xstate'
import { useActiveCart, usePosActor } from '../hooks'
import { cartMachine } from '../machines/cart.machine'
import { Affiliate, CartItem } from '../types/cart.types'
import { AddTabSheet, AddTabSheetRef } from './add-tab-sheet'
import { ProductSearch } from './product-search'

export default function OrderListSession() {
  const posActor = usePosActor()
  const cartActor = useActiveCart()
  const addTabSheetRef = useRef<AddTabSheetRef>(null)

  const carts = useSelector(posActor!, (s) => s.context.carts)
  const activeCartId = useSelector(posActor!, (s) => s.context.activeCartId)
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const cart = useMemo(() => Object.values(items || {}) as CartItem[], [items])

  const handleAddTab = (affiliate: Affiliate | null) => {
    posActor?.send({ type: 'ADD_TAB', affiliate: affiliate ?? undefined })
  }

  return (
    <View className="flex-1 flex-col bg-white">
      {/* Session Tabs — Pill Style */}
      <View className="flex-row items-center border-b border-surface-100 bg-white px-5 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ gap: 8 }}
        >
          {Object.entries(carts)
            .sort(([, a], [, b]) => {
              const sa = (a as ActorRefFrom<typeof cartMachine>)?.getSnapshot()
              const sb = (b as ActorRefFrom<typeof cartMachine>)?.getSnapshot()
              const aRetail = sa && !sa.context.affiliate
              const bRetail = sb && !sb.context.affiliate
              if (aRetail && !bRetail) return -1
              if (!aRetail && bRetail) return 1
              return 0
            })
            .map(([id, actor]) => {
              const isActive = id === activeCartId
              const cartActor = actor as ActorRefFrom<typeof cartMachine>
              const snapshot = cartActor?.getSnapshot()
              if (!snapshot) return null

              const aff = snapshot.context.affiliate
              const label = aff
                ? aff.name
                : (() => {
                    const retailIds = Object.entries(carts)
                      .filter(([, a]) => {
                        const s = (a as ActorRefFrom<typeof cartMachine>)?.getSnapshot()
                        return s && !s.context.affiliate
                      })
                      .map(([rid]) => rid)
                    const pos = retailIds.indexOf(id)
                    return pos >= 0 ? `Khách lẻ ${pos + 1}` : 'Khách lẻ'
                  })()

              return (
                <Pressable
                  key={id}
                  onPress={() => posActor?.send({ type: 'SWITCH_TAB', id })}
                  className="flex-row items-center rounded-full px-5 py-2.5"
                  style={{
                    backgroundColor: isActive ? COLORS.primary.default : COLORS.background.default,
                  }}
                >
                  <Text
                    className="text-md font-bold"
                    style={{ color: isActive ? COLORS.primary.on : COLORS.neutral[500] }}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Pressable
                    className="ml-2 rounded-full p-0.5"
                    onPress={() => {
                      toast.confirm({
                        title: 'Đóng phiên',
                        message: `Bạn có chắc chắn muốn đóng phiên này không?`,
                        onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id }),
                      })
                    }}
                    hitSlop={8}
                  >
                    <X size={14} color={isActive ? COLORS.primary.on : COLORS.neutral[400]} />
                  </Pressable>
                </Pressable>
              )
            })}
        </ScrollView>

        <Button
          label="Thêm phiên"
          leftIcon={Plus}
          iconSize={18}
          variant="outline"
          className="ml-3 h-12 rounded-full border-outline bg-surface-50 px-4 py-0"
          textClassName="text-sm font-bold text-neutral-600"
          onPress={() => addTabSheetRef.current?.open()}
        />
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center justify-between border-b border-surface-100 bg-white px-6 py-4">
        <ProductSearch />

        {cart.length > 0 && (
          <IconButton
            icon={Trash2}
            className="ml-4 h-11 w-11 rounded-xl bg-error/10"
            size={20}
            color={COLORS.error.default}
            onPress={() => {
              toast.confirm({
                title: 'Xóa giỏ hàng',
                message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
                onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id: activeCartId! }),
              })
            }}
          />
        )}
      </View>

      {/* Cart Table */}
      <View className="flex-1 bg-white">
        {/* Table Header */}
        <View className="flex-row items-center border-b border-surface-200 bg-surface-50 px-6 py-3">
          <Text className="w-12 text-[14px] font-bold uppercase tracking-widest text-surface-on">
            STT
          </Text>
          <Text className="flex-1 text-[14px] font-bold uppercase tracking-widest text-surface-on">
            Sản phẩm
          </Text>
          <Text className="w-28 text-center text-[14px] font-bold uppercase tracking-widest text-surface-on">
            Đơn giá
          </Text>
          <Text className="w-16 text-center text-[14px] font-bold uppercase tracking-widest text-surface-on">
            Thuế
          </Text>
          <Text className="w-32 text-center text-[14px] font-bold uppercase tracking-widest text-surface-on">
            Số lượng
          </Text>
          <Text className="w-32 pr-4 text-right text-[14px] font-bold uppercase tracking-widest text-surface-on">
            Thành tiền
          </Text>
          <View className="w-10" />
        </View>

        <FlashList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item, index }) => {
            // Thành tiền = đơn giá × SL × (1 + VAT%)
            const taxRate = item.product.taxRate ?? 0
            const itemTotal = Math.round(item.price * item.quantity * (1 + taxRate / 100))
            return (
              <View className="flex-row items-center border-b border-surface-100 bg-white px-6 py-4">
                <Text className="w-12 text-sm font-bold text-surface-on-variant">{index + 1}</Text>
                <View className="flex-1 pr-2">
                  <Text className="text-[16px] font-black text-surface-on" numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text className="mt-1 text-[12px] font-bold text-primary" numberOfLines={1}>
                    {item.product.sku}
                  </Text>
                </View>
                <Text
                  className="w-28 text-center text-[15px] font-bold text-surface-on"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(item.price)}
                </Text>
                <View className="w-16 items-center">
                  <Text className="text-[13px] font-bold text-surface-on">
                    {item.product.taxRate}%
                  </Text>
                </View>
                <View className="w-32 items-center">
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(quantity) =>
                      cartActor?.send({
                        type: 'UPDATE_QUANTITY',
                        productId: item.product.id,
                        quantity,
                      })
                    }
                    size="sm"
                    min={0}
                    max={item.product.stock ?? undefined}
                    editable={true}
                  />
                </View>
                <Text
                  className="w-32 pr-4 text-right text-base font-black text-primary"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(itemTotal)}
                </Text>
                <View className="w-10 items-center">
                  <IconButton
                    icon={Trash2}
                    className="h-9 w-9 rounded-lg"
                    size={18}
                    color={COLORS.error.default}
                    onPress={() =>
                      cartActor?.send({ type: 'REMOVE_ITEM', productId: item.product.id })
                    }
                  />
                </View>
              </View>
            )
          }}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center py-32">
              <ShoppingBasket size={64} color={COLORS.outline.variant} strokeWidth={1} />
              <Text className="mt-5 text-base font-semibold text-surface-on-variant">
                Giỏ hàng trống
              </Text>
            </View>
          )}
        />
      </View>

      {/* AddTab Sheet */}
      <AddTabSheet ref={addTabSheetRef} onSelect={handleAddTab} />
    </View>
  )
}
