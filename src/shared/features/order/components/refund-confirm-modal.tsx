import { Button, Chip, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth/store/use-auth-store'
import { OrderModel } from '@/shared/lib'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { AlertCircle, X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { OrderService } from '../services/order.service'

export interface RefundConfirmModalRef {
  open: (order: OrderModel) => void
  close: () => void
}

const QUICK_REASONS = ['Khách đổi ý', 'Sản phẩm lỗi', 'Mua nhầm món']

interface RefundConfirmModalProps {
  onSuccess?: () => void
}

export const RefundConfirmModal = React.forwardRef<RefundConfirmModalRef, RefundConfirmModalProps>(
  ({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false)
    const [order, setOrder] = useState<OrderModel | null>(null)
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    useImperativeHandle(ref, () => ({
      open: (o: OrderModel) => {
        setOrder(o)
        setReason('')
        setVisible(true)
      },
      close: () => setVisible(false),
    }))

    const currentShiftId = useAuthStore.getState().session?.shiftId

    const handleConfirm = async () => {
      if (!order) return
      if (!currentShiftId) {
        toast.error('Không tìm thấy ca làm việc hiện tại. Vui lòng kiểm tra lại trạng thái ca.')
        return
      }

      toast.confirm({
        title: 'Xác nhận hoàn tiền',
        message: `Bạn có chắc chắn muốn hoàn tiền ${formatCurrency(order.total)} cho đơn hàng #${order.id} không?`,
        onConfirm: async () => {
          setLoading(true)
          try {
            await OrderService.refundOrder(order, reason, currentShiftId)
            toast.success(`Đã hoàn tiền ${formatCurrency(order.total)} cho đơn hàng #${order.id}`)
            setVisible(false)
            onSuccess?.()
          } catch (error: any) {
            toast.error(error.message || 'Có lỗi xảy ra khi thực hiện hoàn tiền.')
          } finally {
            setLoading(true)
            setLoading(false)
          }
        },
      })
    }

    if (!order) return null

    // Tính tổng số lượng món hàng trong snapshot
    const itemCount = order.itemsSnapshot?.reduce((acc, item) => acc + item.quantity, 0) || 0

    return (
      <ModalBase
        visible={visible}
        onClose={() => setVisible(false)}
        className="w-[850px] rounded-[40px] bg-white shadow-2xl"
      >
        <View className="p-12">
          {/* Header */}
          <View className="mb-10 flex-row items-center justify-between border-b-2 border-outline-variant pb-8">
            <Text className="text-5xl font-black tracking-tight text-surface-on">
              Xác nhận hoàn tiền
            </Text>
            <IconButton
              icon={X}
              size={40}
              color={COLORS.surface.onVariant}
              className="rounded-full bg-surface-100 p-3"
              onPress={() => setVisible(false)}
            />
          </View>

          {/* Warning Note */}
          <View className="mb-10 flex-row items-start gap-5 rounded-[24px] bg-error-container p-6">
            <AlertCircle size={40} color={COLORS.error.default} />
            <View className="flex-1">
              <Text className="text-error-onContainer mb-2 text-2xl font-bold">
                Lưu ý quan trọng
              </Text>
              <Text className="text-error-onContainer text-lg font-medium leading-8 opacity-90">
                Thao tác này sẽ hủy toàn bộ đơn hàng và cộng lại kho. Tiền sẽ được hoàn bằng TIỀN
                MẶT. Hành động này không thể hoàn tác.
              </Text>
            </View>
          </View>

          {/* Item List */}
          <View className="mb-10">
            <Text className="mb-4 text-xl font-bold uppercase tracking-widest text-muted">
              Danh sách sản phẩm hoàn trả
            </Text>
            <View className="max-h-64 overflow-hidden rounded-[24px] border-2 border-outline-variant bg-surface-50">
              <ScrollView showsVerticalScrollIndicator={true} className="p-6">
                {order.itemsSnapshot?.map((item, index) => (
                  <View
                    key={index}
                    className="mb-5 flex-row items-center justify-between last:mb-0"
                  >
                    <View className="mr-6 flex-1">
                      <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-sm font-bold uppercase tracking-wider text-muted">
                        SKU: {item.sku}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-8">
                      <Text className="text-3xl font-black text-surface-on">x{item.quantity}</Text>
                      <Text className="w-40 text-right text-3xl font-black text-primary">
                        {formatCurrency(item.subtotal)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Order Summary */}
          <View className="mb-10 gap-5 rounded-[24px] border-2 border-outline-variant bg-surface-50 p-8">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-muted">Tổng số món hàng:</Text>
              <Text className="text-4xl font-black text-surface-on">{itemCount} món</Text>
            </View>
            <View className="h-[2px] border-dashed bg-outline-variant" />
            <View className="flex-row items-center justify-between">
              <Text className="text-3xl font-black text-muted">TỔNG TIỀN HOÀN:</Text>
              <Text className="text-6xl font-black text-error">{formatCurrency(order.total)}</Text>
            </View>
          </View>

          {/* Input Reason */}
          <View className="mb-12">
            <Text className="mb-5 text-xl font-bold uppercase tracking-widest text-muted">
              Lý do trả hàng (không bắt buộc)
            </Text>

            <View className="mb-6 flex-row flex-wrap gap-4">
              {QUICK_REASONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  active={reason === r}
                  onPress={() => setReason(r)}
                  className="h-16 px-8 py-4"
                />
              ))}
            </View>

            <TextInput
              multiline
              numberOfLines={2}
              placeholder="Hoặc nhập lý do khác..."
              value={reason}
              onChangeText={setReason}
              className="h-24 rounded-[24px] border-2 border-outline-variant bg-white px-6 py-4 text-2xl font-medium text-surface-on"
              textAlignVertical="top"
              placeholderTextColor={COLORS.muted}
            />
          </View>

          {/* Actions */}
          <View className="flex-row gap-6">
            <Button
              label="Hủy bỏ"
              variant="outline"
              className="flex-1"
              onPress={() => setVisible(false)}
            />
            <Button
              label="XÁC NHẬN HOÀN TIỀN"
              variant="error"
              className="flex-1"
              onPress={handleConfirm}
              loading={loading}
            />
          </View>
        </View>
      </ModalBase>
    )
  },
)

RefundConfirmModal.displayName = 'RefundConfirmModal'
