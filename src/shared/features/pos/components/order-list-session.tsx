import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useSelector } from '@xstate/react'
import { Minus, Plus, ShoppingBasket, Trash2, X } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ActorRefFrom } from 'xstate'
import { useActiveCart, usePosActor } from '../hooks'
import { cartMachine } from '../machines/cart.machine'
import { CartItem } from '../types/cart.types'
import { ProductSearch } from './product-search'

export default function OrderListSession() {
  const posActor = usePosActor()
  const cartActor = useActiveCart()

  const carts = useSelector(posActor!, (s) => s.context.carts)
  const activeCartId = useSelector(posActor!, (s) => s.context.activeCartId)
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const cart = useMemo(() => Object.values(items || {}) as CartItem[], [items])

  return (
    <View className="flex-1 flex-col bg-background">
      {/* Session Tabs */}
      <View
        className="flex-row items-center border-b border-outline bg-surface-200 px-6"
        style={{ borderBottomColor: COLORS.outline.default }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-2 pt-3">
            {Object.entries(carts).map(([id, actor], index) => {
              const isActive = id === activeCartId
              const cartActor = actor as ActorRefFrom<typeof cartMachine>
              const snapshot = cartActor?.getSnapshot()
              if (!snapshot) return null
              const label = `Phiên #${index + 1}`

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
                    <X size={16} color={isActive ? COLORS.neutral[300] : COLORS.neutral[400]} />
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
          onPress={() => posActor?.send({ type: 'ADD_TAB' })}
        />
      </View>

      {/* POS Header with Search */}
      <View className="relative z-20 flex-row items-center justify-between border-b border-outline bg-white px-8 py-5">
        <ProductSearch />

        <IconButton
          icon={Trash2}
          size={22}
          color={COLORS.error.default}
          className={`ml-5 h-12 w-12 rounded-xl bg-error-container ${cart.length === 0 ? 'hidden' : ''}`}
          onPress={() => {
            toast.confirm({
              title: 'Xóa giỏ hàng',
              message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
              onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id: activeCartId! }),
            })
          }}
        />
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
                <View className="w-52 items-center">
                  <View
                    className="flex-row items-center self-center rounded-full border"
                    style={{
                      borderColor: COLORS.outline.default,
                      backgroundColor: COLORS.surface[200],
                    }}
                  >
                    <IconButton
                      icon={Minus}
                      size={22}
                      color={COLORS.surface.on}
                      className="p-4"
                      onPress={() =>
                        cartActor?.send({
                          type: 'UPDATE_QUANTITY',
                          productId: item.product.id,
                          quantity: item.quantity - 1,
                        })
                      }
                    />
                    <Text className="w-20 text-center text-2xl font-black text-surface-on">
                      {item.quantity}
                    </Text>
                    <IconButton
                      icon={Plus}
                      size={22}
                      color={COLORS.surface.on}
                      className="p-4"
                      onPress={() =>
                        cartActor?.send({
                          type: 'UPDATE_QUANTITY',
                          productId: item.product.id,
                          quantity: item.quantity + 1,
                        })
                      }
                    />
                  </View>
                </View>
                <Text className="w-44 pr-6 text-right text-xl font-black text-primary">
                  {formatCurrency(itemTotal)}
                </Text>
                <View className="w-16 items-center justify-center">
                  <IconButton
                    icon={Trash2}
                    size={20}
                    color={COLORS.error.default}
                    className="bg-transparent opacity-40"
                    onPress={() =>
                      cartActor?.send({ type: 'REMOVE_ITEM', productId: item.product.id })
                    }
                  />
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
    </View>
  )
}
