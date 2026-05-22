import { Button, Chip, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppStore } from '@/shared/features/app'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useMachine } from '@xstate/react'
import { X } from 'lucide-react-native'
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { refundOrderMachine } from '../machines/refund-order.machine'
import { IOrder } from '../types'

export interface RefundConfirmModalRef {
  open: (order: IOrder) => void
  close: () => void
}

const QUICK_REASONS = ['Khách đổi ý', 'Sản phẩm lỗi', 'Mua nhầm món']

interface RefundConfirmModalProps {
  onSuccess?: () => void
}

export const RefundConfirmModal = React.forwardRef<RefundConfirmModalRef, RefundConfirmModalProps>(
  ({ onSuccess }, ref) => {
    const [state, send] = useMachine(refundOrderMachine)
    const [visible, setVisible] = useState(false)

    const { order, reason } = state.context
    const isLoading = state.matches('refunding')

    useImperativeHandle(ref, () => ({
      open: (o: IOrder) => {
        const shiftId = useAppStore.getState().appService?.getSnapshot().context.cashSessionId || ''
        send({ type: 'START', order: o, shiftId })
        setVisible(true)
      },
      close: () => {
        if (isLoading) return
        setVisible(false)
        send({ type: 'RESET' })
      },
    }))

    // Close modal on success
    useEffect(() => {
      if (state.matches('success')) {
        setVisible(false)
        onSuccess?.()
        // Đợi modal đóng hẳn rồi mới reset machine để tránh UI giật (nếu có dùng data từ context)
        const timer = setTimeout(() => send({ type: 'RESET' }), 300)
        return () => clearTimeout(timer)
      }
    }, [state.value, onSuccess, send])

    const handleConfirm = () => {
      if (!order) return
      if (!state.context.shiftId) {
        toast.error('Không tìm thấy ca làm việc hiện tại. Vui lòng kiểm tra lại trạng thái ca.')
        return
      }
      toast.confirm({
        title: 'Xác nhận hoàn tiền',
        message: `Bạn có chắc chắn muốn hoàn tiền ${formatCurrency(order.total)} cho đơn hàng này không?`,
        onConfirm: () => {
          send({ type: 'SUBMIT' })
        },
      })
    }

    if (!order) return null

    // Tính tổng số lượng món hàng trong snapshot
    const itemCount = order.itemsSnapshot?.reduce((acc, item) => acc + item.quantity, 0) || 0

    const handleClose = () => {
      if (isLoading) return
      setVisible(false)
      send({ type: 'RESET' })
    }

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        dismissible={!isLoading}
        className="h-full w-full max-w-none rounded-none bg-background"
      >
        <SafeAreaView className="flex-1 p-10">
          {/* Header - Simplified */}
          <View className="-mx-10 -mt-10 mb-8 flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
            <Text className="text-3xl font-black tracking-tight text-surface-on">Trả hàng</Text>
            <IconButton
              icon={X}
              size={32}
              color={COLORS.surface.onVariant}
              onPress={handleClose}
              disabled={isLoading}
            />
          </View>

          <View className="flex-1">
            <View className="flex-1 flex-row gap-8">
              {/* Left Side: Product List & Reason */}
              <View className="flex-1 bg-white">
                {/* Sticky Table Header */}
                <View className="flex-row border-b border-outline-variant bg-[#f8fafc] px-10 py-5">
                  <Text className="flex-1 text-sm font-black uppercase tracking-wider text-muted">
                    Sản phẩm
                  </Text>
                  <Text className="w-20 text-center text-sm font-black uppercase tracking-wider text-muted">
                    SL
                  </Text>
                  <Text className="w-32 text-right text-sm font-black uppercase tracking-wider text-muted">
                    Thành tiền
                  </Text>
                </View>

                <FlashList<ItemSnapshot>
                  data={order.itemsSnapshot || []}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View
                      key={index}
                      className="flex-row items-center border-b border-outline-variant px-10 py-8"
                    >
                      <View className="flex-1">
                        <Text className="text-2xl font-black text-surface-on">{item.name}</Text>
                        <Text className="mt-1 text-sm font-bold text-muted/60">{item.sku}</Text>
                      </View>
                      <Text className="w-20 text-center text-2xl font-black text-surface-on">
                        x{item.quantity}
                      </Text>
                      <Text className="w-32 text-right text-2xl font-black text-primary">
                        {formatCurrency(item.subtotal)}
                      </Text>
                    </View>
                  )}
                />
              </View>

              {/* Right Side: Order Summary & Actions */}
              <View className="-my-10 flex-1 justify-between border-l border-outline-variant bg-surface-50 p-10">
                <View>
                  <Text className="mb-8 text-xl font-black uppercase tracking-widest text-surface-on">
                    Thông tin hoàn trả
                  </Text>

                  <View className="gap-6">
                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Đơn hàng</Text>
                      <Text className="text-xl font-black text-surface-on">#{order.id}</Text>
                    </View>

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Tổng số món</Text>
                      <Text className="text-xl font-black text-surface-on">{itemCount} món</Text>
                    </View>

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Hình thức hoàn</Text>
                      <Text className="text-xl font-black text-primary">Tiền mặt</Text>
                    </View>

                    {order.discount > 0 && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                        <Text className="text-xl font-bold text-muted">Chiết khấu đơn hàng</Text>
                        <Text className="text-xl font-black text-error">
                          -{formatCurrency(order.discount)}
                        </Text>
                      </View>
                    )}

                    {order.voucherCode && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                        <View>
                          <Text className="text-xl font-bold text-muted">Voucher giảm giá</Text>
                          <Text className="mt-1 text-sm font-black uppercase text-primary">
                            Mã: {order.voucherCode}
                          </Text>
                        </View>
                        <Text className="text-xl font-black text-error">
                          -{formatCurrency(order.voucherDiscount)}
                        </Text>
                      </View>
                    )}

                    <View className="mt-8 flex-row items-center justify-between gap-4 border-t-2 border-outline-variant pt-8">
                      <Text className="text-2xl font-black uppercase tracking-tighter text-surface-on">
                        Tổng tiền hoàn trả
                      </Text>
                      <Text className="text-7xl font-black text-error" numberOfLines={1}>
                        {formatCurrency(order.total)}
                      </Text>
                    </View>
                  </View>

                  {/* Input Reason Section - Moved below price */}
                  <View className="mb-6 mt-10">
                    <Text className="mb-4 text-lg font-black uppercase tracking-widest text-muted">
                      Lý do trả hàng
                    </Text>

                    <View className="mb-4 flex-row flex-wrap gap-4">
                      {QUICK_REASONS.map((r) => (
                        <Chip
                          key={r}
                          label={r}
                          active={reason === r}
                          onPress={() => send({ type: 'SET_REASON', reason: r })}
                          className="h-18 self-start px-8 py-4"
                          textClassName="text-xl font-black"
                          disabled={isLoading}
                        />
                      ))}
                    </View>

                    <TextInput
                      multiline
                      numberOfLines={2}
                      placeholder="Nhập lý do khác..."
                      value={reason}
                      onChangeText={(text) => send({ type: 'SET_REASON', reason: text })}
                      className="h-28 rounded-2xl border border-outline-variant bg-white px-6 py-4 text-xl font-bold text-surface-on"
                      textAlignVertical="top"
                      placeholderTextColor={COLORS.muted}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Actions Grouped at Bottom */}
                <View className="gap-4">
                  <Button
                    label="Hủy bỏ"
                    variant="outline"
                    className="h-16 rounded-2xl"
                    textClassName="text-xl font-black"
                    onPress={handleClose}
                    disabled={isLoading}
                  />
                  <Button
                    label="XÁC NHẬN TRẢ HÀNG"
                    variant="error"
                    className="h-20 rounded-2xl"
                    textClassName="text-2xl font-black"
                    onPress={handleConfirm}
                    loading={isLoading}
                  />
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ModalBase>
    )
  },
)

RefundConfirmModal.displayName = 'RefundConfirmModal'
