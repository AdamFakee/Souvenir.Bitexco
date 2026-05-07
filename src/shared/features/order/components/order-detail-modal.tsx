import { Button, IconButton, ModalBase as Modal } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { OrderModel } from '@/shared/lib/database'
import { formatCurrency } from '@/shared/utils'
import { Clock, CreditCard, Printer, ShieldCheck, Tag, Trash2, User, X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

export interface OrderDetailModalRef {
  open: (order: OrderModel) => void
  close: () => void
}

interface OrderDetailModalProps {
  ref?: React.Ref<OrderDetailModalRef>
}

export default function OrderDetailModal({ ref }: OrderDetailModalProps) {
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState<OrderModel | null>(null)

  useImperativeHandle(ref, () => ({
    open: (o: OrderModel) => {
      setOrder(o)
      setVisible(true)
    },
    close: () => setVisible(false),
  }))

  if (!order) return null

  const items = order.itemsSnapshot || []
  const payments = order.paymentsSnapshot || []

  const statusColors: Record<string, string> = {
    COMPLETED: '#10b981',
    REFUNDED: '#f59e0b',
    FAILED: '#ef4444',
  }

  const statusBgColors: Record<string, string> = {
    COMPLETED: '#d1fae5',
    REFUNDED: '#fef3c7',
    FAILED: '#fee2e2',
  }

  const statusLabels: Record<string, string> = {
    COMPLETED: 'Hoàn thành',
    REFUNDED: 'Hoàn tiền',
    FAILED: 'Thất bại',
  }

  return (
    <Modal
      visible={visible}
      onClose={() => setVisible(false)}
      className="h-[80vh] w-[90vw] max-w-[1100px] overflow-hidden rounded-[40px] bg-white shadow-2xl"
    >
      <View className="flex-1 p-10">
        {/* Custom Header */}
        <View className="mb-8 flex-row items-center justify-between border-b-2 border-outline-variant pb-6">
          <Text className="text-4xl font-black tracking-tight text-surface-on">
            Chi tiết đơn hàng <Text className="text-primary">#{order.id}</Text>
          </Text>
          <IconButton
            icon={X}
            size={36}
            color={COLORS.surface.onVariant}
            className="rounded-full bg-surface-100 p-2"
            onPress={() => setVisible(false)}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Summary Info Grid */}
          <View className="mb-8 flex-row flex-wrap gap-4 rounded-[24px] border border-outline-variant bg-[#f8fafc] p-8">
            <View className="w-[48%] flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                <Clock size={20} color={COLORS.outline.default} />
              </View>
              <View>
                <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Thời gian
                </Text>
                <Text className="text-base font-black text-surface-on">
                  {order.createdAt.toLocaleString('vi-VN')}
                </Text>
              </View>
            </View>

            <View className="w-[48%] flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                <User size={20} color={COLORS.outline.default} />
              </View>
              <View>
                <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Nhân viên
                </Text>
                <Text className="text-base font-black text-surface-on">Admin (129129)</Text>
              </View>
            </View>

            <View className="mt-4 w-[48%] flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                <ShieldCheck size={20} color={COLORS.outline.default} />
              </View>
              <View>
                <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">
                  Trạng thái
                </Text>
                <View
                  className="self-start rounded-full px-3 py-1"
                  style={{ backgroundColor: statusBgColors[order.status] }}
                >
                  <Text
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: statusColors[order.status] }}
                  >
                    {statusLabels[order.status]}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4 w-[48%] flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                <Tag size={20} color={COLORS.outline.default} />
              </View>
              <View>
                <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                  CTV / Affiliate
                </Text>
                <Text className="text-base font-black text-surface-on">—</Text>
              </View>
            </View>

            <View className="mt-4 w-full flex-row items-center gap-4 border-t border-dashed border-outline-variant pt-6">
              <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                <CreditCard size={20} color={COLORS.outline.default} />
              </View>
              <View>
                <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Phương thức thanh toán
                </Text>
                <View className="mt-1 flex-row gap-2">
                  {payments.map((p, i) => (
                    <View key={i} className="rounded-lg bg-primary/10 px-3 py-1">
                      <Text className="text-sm font-bold text-primary">{p.method}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View className="mb-8 overflow-hidden rounded-[24px] border border-outline-variant">
            <View className="flex-row border-b border-outline-variant bg-[#f1f5f9] px-6 py-4">
              <Text className="flex-1 text-xs font-black uppercase tracking-widest text-muted">
                Sản phẩm
              </Text>
              <Text className="w-20 text-center text-xs font-black uppercase tracking-widest text-muted">
                Số lượng
              </Text>
              <Text className="w-32 text-right text-xs font-black uppercase tracking-widest text-muted">
                Đơn giá
              </Text>
              <Text className="w-32 text-right text-xs font-black uppercase tracking-widest text-muted">
                Thành tiền
              </Text>
            </View>
            {items.map((item, index) => (
              <View
                key={index}
                className="flex-row border-b border-outline-variant px-6 py-5 last:border-b-0"
              >
                <View className="flex-1">
                  <Text className="text-base font-black text-surface-on">{item.name}</Text>
                  <Text className="mt-1 text-sm font-bold text-muted">{item.sku}</Text>
                </View>
                <Text className="w-20 text-center text-base font-black text-surface-on">
                  {item.quantity}
                </Text>
                <Text className="w-32 text-right text-base font-medium text-surface-on">
                  {formatCurrency(item.price)}
                </Text>
                <Text className="w-32 text-right text-lg font-black text-primary">
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>

          {/* Calculations */}
          <View className="mb-8 items-end gap-3 px-4">
            <View className="w-80 flex-row items-center justify-between">
              <Text className="text-base font-bold text-muted">Tạm tính:</Text>
              <Text className="text-lg font-black text-surface-on">
                {formatCurrency(order.subtotal)}
              </Text>
            </View>
            <View className="w-80 flex-row items-center justify-between">
              <Text className="text-base font-bold text-muted">Giảm giá:</Text>
              <Text className="text-lg font-black text-error">
                -{formatCurrency(order.discount)}
              </Text>
            </View>
            <View className="mt-2 w-80 flex-row items-center justify-between border-t-2 border-outline-variant pt-4">
              <Text className="text-xl font-black uppercase tracking-tight text-surface-on">
                Tổng cộng:
              </Text>
              <Text className="text-3xl font-black text-primary">
                {formatCurrency(order.total)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between rounded-b-[40px] border-t border-outline-variant bg-[#f8fafc] p-8">
        <Button
          label="Hủy đơn hàng"
          variant="outline"
          leftIcon={Trash2}
          className="rounded-2xl border-error/30 bg-white"
          textClassName="text-error font-bold"
          onPress={() => {}}
        />
        <Button
          label="In lại hóa đơn"
          leftIcon={Printer}
          className="h-16 rounded-2xl px-10"
          textClassName="text-xl font-black"
          onPress={() => {}}
        />
      </View>
    </Modal>
  )
}
