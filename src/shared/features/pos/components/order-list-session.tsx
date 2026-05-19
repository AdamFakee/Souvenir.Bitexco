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

  // Tab Data from POS Actor
  const carts = useSelector(posActor!, (s) => s.context.carts)
  const activeCartId = useSelector(posActor!, (s) => s.context.activeCartId)

  // Items from Active Cart Actor
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const cart = useMemo(() => Object.values(items || {}) as CartItem[], [items])

  return (
    <View className="flex-1 flex-col bg-surface-50">
      {/* Session Tabs */}
      <View className="flex-row items-center border-b border-[#e2e8f0] bg-[#f1f5f9] px-6">
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
                  className={`min-w-[200px] flex-row items-center rounded-t-2xl border-x border-t px-8 py-6 ${
                    isActive ? 'border-[#e2e8f0] bg-white' : 'border-transparent bg-[#e2e8f0]'
                  }`}
                  style={
                    isActive
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: '#ffffff',
                          marginBottom: -1,
                          zIndex: 10,
                        }
                      : {}
                  }
                >
                  <Text
                    className={`flex-1 text-xl font-black ${
                      isActive ? 'text-surface-on' : 'text-muted'
                    }`}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Pressable
                    className="ml-2 h-7 w-7 items-center justify-center rounded-full active:bg-error/10"
                    onPress={() => {
                      toast.confirm({
                        title: 'Hủy đơn',
                        message: `Bạn có chắc chắn muốn hủy ${label} không?`,
                        onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id }),
                      })
                    }}
                  >
                    <X size={18} color={isActive ? '#94a3b8' : '#64748b'} />
                  </Pressable>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        <Button
          label="Thêm tab"
          leftIcon={Plus}
          iconSize={24}
          variant="outline"
          className="ml-6 h-16 rounded-2xl border-[#e2e8f0] bg-white px-8"
          textClassName="text-lg font-black text-[#64748b]"
          onPress={() => posActor?.send({ type: 'ADD_TAB' })}
        />
      </View>

      {/* POS Header with Search */}
      <View className="relative z-20 flex-row items-center justify-between border-b border-outline-variant bg-white px-8 py-5">
        <ProductSearch />

        <IconButton
          icon={Trash2}
          size={24}
          color={COLORS.error.default}
          className={`ml-5 h-14 w-14 rounded-2xl bg-error/10 ${cart.length === 0 ? 'hidden' : ''}`}
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
        <View className="flex-row items-center border-b-2 border-outline-variant bg-[#f1f5f9] px-8 py-6">
          <Text className="w-20 text-lg font-black uppercase text-muted">STT</Text>
          <Text className="flex-1 text-lg font-black uppercase text-muted">Tên sản phẩm</Text>
          <Text className="w-48 text-center text-lg font-black uppercase text-muted">Đơn giá</Text>
          <Text className="w-48 text-center text-lg font-black uppercase text-muted">Thuế</Text>
          <Text className="w-56 text-center text-lg font-black uppercase text-muted">SL</Text>
          <Text className="w-48 pr-8 text-right text-lg font-black uppercase text-muted">
            Thành tiền
          </Text>
          <View className="w-20" />
        </View>

        <FlashList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item, index }) => {
            const itemTotal = item.price * item.quantity
            return (
              <View
                key={item.product.id}
                className="flex-row items-center border-b border-outline-variant px-8 py-8 active:bg-surface-100"
              >
                <Text className="w-20 text-xl font-bold text-surface-on-variant">{index + 1}</Text>
                <View className="flex-1">
                  <Text className="text-2xl font-black text-surface-on">{item.product.nameVi}</Text>
                  <Text className="mt-1 text-sm font-bold text-muted">{item.product.sku}</Text>
                </View>
                <Text className="w-48 text-center text-xl font-bold text-surface-on">
                  {formatCurrency(item.price)}
                </Text>
                <View className="w-48 items-center justify-center">
                  <Text className="text-xl font-bold text-surface-on">{item.product.taxRate}%</Text>
                </View>
                <View className="w-56 items-center">
                  <View className="flex-row items-center self-center rounded-[20px] border border-outline-variant bg-surface-200">
                    <IconButton
                      icon={Minus}
                      size={28}
                      color={COLORS.surface.on}
                      className="p-5"
                      onPress={() =>
                        cartActor?.send({
                          type: 'UPDATE_QUANTITY',
                          productId: item.product.id,
                          quantity: item.quantity - 1,
                        })
                      }
                    />
                    <Text className="w-24 text-center text-3xl font-black text-surface-on">
                      {item.quantity}
                    </Text>
                    <IconButton
                      icon={Plus}
                      size={28}
                      color={COLORS.surface.on}
                      className="p-5"
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
                <Text className="w-48 pr-8 text-right text-2xl font-black text-primary">
                  {formatCurrency(itemTotal)}
                </Text>
                <View className="w-20 items-center justify-center">
                  <IconButton
                    icon={Trash2}
                    size={32}
                    color={COLORS.error.default}
                    className="bg-transparent opacity-50"
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
              <ShoppingBasket size={80} color={COLORS.outline.variant} strokeWidth={1} />
              <Text className="mt-6 text-xl font-medium text-surface-on-variant">
                Giỏ hàng trống
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  )
}
