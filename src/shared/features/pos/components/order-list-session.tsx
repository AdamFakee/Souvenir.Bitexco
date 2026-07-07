import { Button, QuantityStepper } from '@/shared/components/ui'
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
    <View className="flex-1 flex-col bg-background">
      {/* Session Tabs */}
      <View
        className="flex-row items-center border-b border-outline bg-surface-200 px-6"
        style={{ borderBottomColor: COLORS.outline.default }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-2 pt-3">
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
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      minWidth: 200,
                      paddingHorizontal: 24,
                      paddingVertical: 20,
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                      borderWidth: 1,
                      borderBottomWidth: isActive ? 0 : 1,
                      marginBottom: isActive ? -1 : 0,
                      zIndex: isActive ? 10 : 0,
                      backgroundColor: isActive ? COLORS.surface[50] : COLORS.surface[400],
                      borderColor: isActive ? COLORS.outline.default : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 18,
                        fontFamily: 'Manrope-Bold',
                        fontWeight: '700',
                        color: isActive ? COLORS.surface.on : COLORS.neutral[400],
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Pressable
                      style={{ marginLeft: 8, padding: 4, borderRadius: 20 }}
                      onPress={() => {
                        toast.confirm({
                          title: 'Hủy đơn',
                          message: `Bạn có chắc chắn muốn hủy ${label} không?`,
                          onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id }),
                        })
                      }}
                    >
                      <X size={16} color={isActive ? COLORS.error.default : COLORS.neutral[400]} />
                    </Pressable>
                  </Pressable>
                )
              })}
          </View>
        </ScrollView>

        <Button
          label="Thêm tab"
          leftIcon={Plus}
          iconSize={22}
          variant="outline"
          className="ml-6 h-14 rounded-xl border-outline bg-surface-50 px-6"
          textClassName="text-base font-bold text-neutral-600"
          onPress={() => addTabSheetRef.current?.open()}
        />
      </View>

      {/* POS Header with Search */}
      <View className="relative z-20 flex-row items-center justify-between border-b border-outline bg-white px-8 py-5">
        <ProductSearch />

        {cart.length > 0 && (
          <Pressable
            className="ml-5 h-12 w-12 items-center justify-center rounded-xl bg-error-container"
            onPress={() => {
              toast.confirm({
                title: 'Xóa giỏ hàng',
                message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
                onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id: activeCartId! }),
              })
            }}
          >
            <Trash2 size={22} color={COLORS.error.default} />
          </Pressable>
        )}
      </View>

      {/* Cart Table */}
      <View className="flex-1 overflow-hidden bg-white">
        {/* Table Header */}
        <View
          className="flex-row items-center border-b-2 px-8 py-5"
          style={{ backgroundColor: COLORS.neutral[50], borderBottomColor: COLORS.outline.default }}
        >
          <Text className="w-20 text-base font-black uppercase text-muted">STT</Text>
          <Text className="flex-1 text-base font-black uppercase text-muted">Tên sản phẩm</Text>
          <Text className="w-44 text-center text-base font-black uppercase text-muted">
            Đơn giá
          </Text>
          <Text className="w-44 text-center text-base font-black uppercase text-muted">Thuế</Text>
          <Text className="w-52 text-center text-base font-black uppercase text-muted">SL</Text>
          <Text className="w-44 pr-6 text-right text-base font-black uppercase text-muted">
            Thành tiền
          </Text>
          <View className="w-16" />
        </View>

        <FlashList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item, index }) => {
            const itemTotal = item.price * item.quantity
            return (
              <View
                className="flex-row items-center border-b px-8 py-6 active:bg-surface-100"
                style={{ borderBottomColor: COLORS.outline.variant }}
              >
                <Text className="w-20 text-lg font-bold text-surface-on-variant">{index + 1}</Text>
                <View className="flex-1">
                  <Text className="text-xl font-black text-surface-on">{item.product.name}</Text>
                  <Text className="mt-0.5 text-sm font-bold text-muted">{item.product.sku}</Text>
                </View>
                <Text className="w-44 text-center text-lg font-bold text-surface-on">
                  {formatCurrency(item.price)}
                </Text>
                <View className="w-44 items-center justify-center">
                  <Text className="text-lg font-bold text-surface-on">{item.product.taxRate}%</Text>
                </View>
                <View className="w-52 items-center justify-center">
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(quantity) =>
                      cartActor?.send({
                        type: 'UPDATE_QUANTITY',
                        productId: item.product.id,
                        quantity,
                      })
                    }
                    min={0}
                    max={item.product.stock ?? undefined}
                    editable={true}
                  />
                </View>
                <Text className="w-44 pr-6 text-right text-xl font-black text-primary">
                  {formatCurrency(itemTotal)}
                </Text>
                <View className="w-16 items-center justify-center">
                  <Pressable
                    className="h-10 w-10 items-center justify-center"
                    onPress={() =>
                      cartActor?.send({ type: 'REMOVE_ITEM', productId: item.product.id })
                    }
                  >
                    <Trash2 size={20} color={COLORS.error.default} style={{ opacity: 0.4 }} />
                  </Pressable>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center p-32">
              <ShoppingBasket size={72} color={COLORS.outline.variant} strokeWidth={1} />
              <Text className="mt-6 text-lg font-semibold text-surface-on-variant">
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
