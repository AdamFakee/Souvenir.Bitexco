import { Button, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { OrderStatus } from '@/shared/lib/database/models/order'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Printer, Trash2, X } from 'lucide-react-native'
import React, { useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IOrder } from '../types'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { RefundConfirmModal, RefundConfirmModalRef } from './refund-confirm-modal'

export interface OrderDetailModalRef {
  open: (order: IOrder) => void
  close: () => void
}

interface OrderDetailModalProps {
  ref?: React.Ref<OrderDetailModalRef>
}

export default function OrderDetailModal({ ref }: OrderDetailModalProps) {
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState<IOrder | null>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)
  const printRef = useRef(null)

  const handlePrint = async () => {
    try {
      if (!printRef.current) return
      await PrinterService.printComponent(printRef)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi in hóa đơn')
    }
  }

  useImperativeHandle(ref, () => ({
    open: (o: IOrder) => {
      setOrder(o)
      setVisible(true)
    },
    close: () => setVisible(false),
  }))

  if (!order) return null

  const items = order.itemsSnapshot || []
  const payments = order.paymentsSnapshot || []

  const statusColors: Record<string, string> = {
    PENDING: '#3b82f6',
    COMPLETED: '#10b981',
    REFUNDED: '#f59e0b',
    FAILED: '#ef4444',
  }

  const statusBgColors: Record<string, string> = {
    PENDING: '#dbeafe',
    COMPLETED: '#d1fae5',
    REFUNDED: '#fef3c7',
    FAILED: '#fee2e2',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Chờ thanh toán',
    COMPLETED: 'Hoàn thành',
    REFUNDED: 'Hoàn tiền',
    FAILED: 'Thất bại',
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Tiền mặt',
    CARD: 'Thẻ',
    BANK_TRANSFER: 'Chuyển khoản',
  }

  return (
    <>
      {/* Hidden Container for Printing */}
      <View style={{ position: 'absolute', left: -2000, top: 0 }}>
        <View collapsable={false} ref={printRef}>
          <BitexcoReceiptTemplate order={order} />
        </View>
      </View>

      <ModalBase visible={visible} onClose={() => setVisible(false)} size="90%">
        <SafeAreaView className="flex-1">
          {/* Header - Simple & Clean */}
          <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
            <View className="flex-row items-center gap-4">
              <Text className="text-3xl font-black tracking-tight text-surface-on">
                Chi tiết đơn hàng
              </Text>
            </View>
            <IconButton
              icon={X}
              size={32}
              color={COLORS.surface.onVariant}
              onPress={() => setVisible(false)}
            />
          </View>

          <View className="flex-1 flex-row">
            {/* Left Side: Product List (Similar to OrderListSession) */}
            <View className="flex-[1.6] bg-white">
              {/* Sticky Table Header */}
              <View className="flex-row border-b border-outline-variant bg-[#f8fafc] px-10 py-5">
                <Text className="flex-1 text-sm font-black uppercase tracking-wider text-muted">
                  Sản phẩm
                </Text>
                <Text className="w-24 text-center text-sm font-black uppercase tracking-wider text-muted">
                  Số lượng
                </Text>
                <Text className="w-40 text-center text-sm font-black uppercase tracking-wider text-muted">
                  Đơn giá
                </Text>
                <Text className="w-48 text-right text-sm font-black uppercase tracking-wider text-muted">
                  Thành tiền
                </Text>
              </View>

              <FlashList
                data={items}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View
                    key={index}
                    className="flex-row items-center border-b border-outline-variant px-10 py-8 active:bg-surface-100"
                  >
                    <View className="flex-1">
                      <Text className="text-2xl font-black text-surface-on">{item.name}</Text>
                      <Text className="mt-1 text-sm font-bold text-muted/60">{item.sku}</Text>
                    </View>
                    <View className="w-24 items-center">
                      <Text className="text-3xl font-black text-surface-on">{item.quantity}</Text>
                    </View>
                    <View className="w-40 items-center">
                      <Text className="text-xl font-bold text-muted" numberOfLines={1}>
                        {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <View className="w-48 items-end">
                      <Text className="text-2xl font-black text-primary" numberOfLines={1}>
                        {formatCurrency(item.subtotal)}
                      </Text>
                      {item.discountAmount > 0 && (
                        <Text className="mt-1 text-xs font-bold text-error" numberOfLines={1}>
                          -{formatCurrency(item.discountAmount)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              />
            </View>

            {/* Right Side: Order Summary (Similar to CheckoutPanel) */}
            <View className="flex-1 border-l border-outline-variant bg-surface-50 p-10">
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <Text className="mb-8 text-2xl font-black uppercase tracking-widest text-surface-on">
                  Thông tin đơn hàng
                </Text>

                {/* Summary Grid - Simple Rows */}
                <View className="gap-5">
                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-lg font-bold text-muted">Mã đơn hàng</Text>
                    <Text className="text-lg font-black text-primary">#{order.id}</Text>
                  </View>
                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-lg font-bold text-muted">Trạng thái</Text>
                    <View
                      className="rounded-full px-4 py-1"
                      style={{ backgroundColor: statusBgColors[order.status] }}
                    >
                      <Text
                        className="text-base font-black uppercase tracking-widest"
                        style={{ color: statusColors[order.status] }}
                      >
                        {statusLabels[order.status]}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-lg font-bold text-muted">Thời gian</Text>
                    <Text className="text-lg font-black text-surface-on">
                      {order.createdAt.toLocaleString('vi-VN')}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-lg font-bold text-muted">Mã nhân viên</Text>
                    <Text className="text-lg font-black text-surface-on">{order.staffId}</Text>
                  </View>

                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-lg font-bold text-muted">Mã ca làm việc</Text>
                    <Text className="text-lg font-black text-surface-on">{order.shiftId}</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-muted">Phương thức</Text>
                    <View className="flex-row gap-2">
                      {payments.map((p, i) => (
                        <Text key={i} className="text-lg font-black text-primary">
                          {paymentMethodLabels[p.method] || p.method}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {order.voucherCode && (
                    <View className="mt-5 flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-muted">Voucher</Text>
                      <Text className="text-lg font-black uppercase text-primary">
                        {order.voucherCode}
                      </Text>
                    </View>
                  )}

                  {order.note && (
                    <View className="mt-2">
                      <Text className="text-lg font-bold text-muted">Ghi chú</Text>
                      <Text className="mt-2 text-lg italic leading-relaxed text-surface-on">
                        {order.note}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Totals Section - Similar to CheckoutPanel summary */}
                <View className="mt-12 gap-5 border-t-2 border-outline-variant pt-8">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-bold text-muted">Tạm tính</Text>
                    <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
                      {formatCurrency(order.subtotal)}
                    </Text>
                  </View>

                  {order.discount > 0 && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-bold text-error">Giảm giá</Text>
                      <Text className="text-2xl font-black text-error" numberOfLines={1}>
                        -{formatCurrency(order.discount)}
                      </Text>
                    </View>
                  )}

                  {order.totalTax > 0 && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-bold text-muted">Thuế VAT</Text>
                      <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
                        {formatCurrency(order.totalTax)}
                      </Text>
                    </View>
                  )}

                  <View className="mt-4 flex-row items-center justify-between border-t-2 border-outline-variant pt-6">
                    <Text className="text-2xl font-black uppercase tracking-tighter text-surface-on">
                      Tổng thanh toán
                    </Text>
                    <Text className="text-6xl font-black text-primary">
                      {formatCurrency(order.total)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons - POS Style */}
              <View className="mt-10 flex-row justify-end gap-6">
                <Button
                  label={order.status === OrderStatus.REFUNDED ? 'Đã hoàn tiền' : 'Trả hàng'}
                  variant="outline"
                  leftIcon={Trash2}
                  className="h-16 rounded-2xl border-error/30 bg-white px-8"
                  textClassName="text-xl text-error font-black"
                  disabled={!order.canReturn && order.status !== OrderStatus.COMPLETED}
                  onPress={() => {
                    refundModalRef.current?.open(order)
                    setVisible(false)
                  }}
                />
                <Button
                  label="In hóa đơn"
                  leftIcon={Printer}
                  className="h-16 rounded-2xl px-12"
                  textClassName="text-xl font-black"
                  onPress={handlePrint}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ModalBase>

      <RefundConfirmModal
        ref={refundModalRef}
        onSuccess={() => {
          setVisible(false)
        }}
      />
    </>
  )
}
