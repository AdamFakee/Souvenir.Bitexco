import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Image as ExpoImage } from 'expo-image'
import { Minus, Plus, ShoppingBasket, Trash2, X } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useCartStore } from '../store'

export default function OrderListSession() {
  const {
    sessions,
    activeSessionId,
    createNewSession,
    removeSession,
    setActiveSession,
    updateQuantity,
    removeItem,
  } = useCartStore()

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.items])

  return (
    <View className="flex-1 flex-col border-r border-outline-variant">
      {/* Session Tabs */}
      <View className="flex-row items-center border-b border-outline-variant bg-surface-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row gap-2 p-2">
            {Object.values(sessions).map((session) => {
              const isActive = session.id === activeSessionId
              const itemCount = Object.values(session.items).reduce(
                (sum, item) => sum + item.quantity,
                0,
              )

              return (
                <Pressable
                  key={session.id}
                  onPress={() => setActiveSession(session.id)}
                  className={`flex-row items-center rounded-t-xl border-x border-t px-5 py-3 ${
                    isActive
                      ? 'border-b-0 border-outline-variant bg-surface-50'
                      : 'border-transparent bg-surface-300'
                  }`}
                  style={
                    isActive
                      ? { borderBottomColor: COLORS.surface[50], marginBottom: -1, zIndex: 10 }
                      : {}
                  }
                >
                  <Text
                    className={`mr-3 text-body-base font-bold ${isActive ? 'text-primary' : 'text-surface-on-variant'}`}
                  >
                    {session.name}
                  </Text>
                  {itemCount > 0 && (
                    <View className="mr-3 rounded-full bg-primary px-2 py-0.5">
                      <Text className="text-xs font-bold text-primary-on">{itemCount}</Text>
                    </View>
                  )}
                  <IconButton
                    icon={X}
                    size={16}
                    color={isActive ? COLORS.error.default : COLORS.outline.default}
                    className="h-6 w-6 bg-transparent"
                    hitSlop={8}
                    onPress={() => {
                      toast.confirm({
                        title: 'Hủy đơn',
                        message: `Bạn có chắc chắn muốn hủy ${session.name} không?`,
                        onConfirm: () => removeSession(session.id),
                      })
                    }}
                  />
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
        <View className="border-l border-outline-variant bg-surface-200 p-2">
          <IconButton
            icon={Plus}
            size={24}
            color={COLORS.primary.default}
            onPress={() => createNewSession()}
          />
        </View>
      </View>

      {/* Cart Header */}
      <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-50 p-4">
        <View className="flex-1 flex-row items-center justify-end">
          <ShoppingBasket size={24} color={COLORS.primary.default} />
          <Text className="ml-3 text-xl font-bold text-surface-on">Danh sách sản phẩm</Text>
        </View>
      </View>

      {/* Cart Items List */}
      <View className="flex-1 bg-surface-100">
        {cart.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="mb-6 rounded-full bg-surface-200 p-8">
              <ShoppingBasket size={80} color={COLORS.outline.variant} strokeWidth={1.2} />
            </View>
            <Text className="text-headline-sm font-bold text-surface-on">Giỏ hàng trống</Text>

            {!activeSessionId ? (
              <Button
                label="Tạo đơn mới"
                leftIcon={Plus}
                onPress={() => createNewSession()}
                variant="primary"
                className="mt-8 px-12"
              />
            ) : (
              <Text className="mt-4 text-center text-body-base text-surface-on-variant">
                Quét mã vạch hoặc chọn sản phẩm từ danh mục{'\n'}để thêm vào đơn hàng hiện tại
              </Text>
            )}
          </View>
        ) : (
          <FlashList
            data={cart}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={{ paddingVertical: 12, marginHorizontal: 12 }}
            renderItem={({ item }) => (
              <View className="mb-4 flex-row items-center justify-between rounded-3xl border border-outline-variant bg-surface-50 p-3">
                <View className="mr-4 h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-surface-200">
                  {item.product.image ? (
                    <ExpoImage
                      source={{ uri: item.product.image }}
                      className="h-full w-full"
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory"
                    />
                  ) : (
                    <ShoppingBasket size={32} color={COLORS.outline.default} />
                  )}
                </View>
                <View className="flex-1 pr-6">
                  <Text className="text-xl font-bold text-surface-on" numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text className="mt-2 text-lg font-black text-primary">
                    {formatCurrency(item.product.price)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="mr-6 h-16 flex-row items-center rounded-2xl border border-outline-variant bg-surface-100">
                    <IconButton
                      icon={Minus}
                      size={24}
                      color={COLORS.outline.default}
                      className="p-4"
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                    />
                    <Text className="px-5 text-xl font-black text-surface-on">{item.quantity}</Text>
                    <IconButton
                      icon={Plus}
                      size={24}
                      color={COLORS.outline.default}
                      className="p-4"
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                    />
                  </View>
                  <IconButton
                    icon={Trash2}
                    size={24}
                    color={COLORS.error.default}
                    className="ml-4 h-16 w-16 rounded-2xl bg-error/10"
                    onPress={() => removeItem(item.product.id)}
                  />
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  )
}
