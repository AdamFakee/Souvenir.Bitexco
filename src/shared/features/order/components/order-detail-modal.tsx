import { Button, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { OrderModel } from '@/shared/lib/database'
import { OrderStatus } from '@/shared/lib/database/models/order'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { Clock, CreditCard, Printer, ShieldCheck, Tag, Trash2, User, X } from 'lucide-react-native'
import React, { useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { RefundConfirmModal, RefundConfirmModalRef } from './refund-confirm-modal'

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
  const refundModalRef = useRef<RefundConfirmModalRef>(null)
  const printRef = useRef(null)

  const handlePrint = async () => {
    try {
      if (!printRef.current) return
      await PrinterService.printComponent(printRef)
      toast.success('Đang in hóa đơn...')
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi in hóa đơn')
    }
  }

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

      <ModalBase
        visible={visible}
        onClose={() => setVisible(false)}
        className="h-[80vh] w-[90vw] max-w-[1100px] overflow-hidden rounded-[40px] bg-white shadow-2xl"
      >
        <View className="flex-1 p-10">
          {/* Custom Header */}
          <View className="mb-8 flex-row items-center justify-between border-b-2 border-outline-variant pb-6">
            <View className="flex-row items-center gap-4">
              <Text className="text-4xl font-black tracking-tight text-surface-on">
                Chi tiết đơn hàng <Text className="text-primary">#{order.id}</Text>
              </Text>
            </View>
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
                    Nhân viên / Ca làm việc
                  </Text>
                  <Text className="text-base font-black text-surface-on">
                    ID: {order.staffId} | Shift: {order.shiftId}
                  </Text>
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
                  <CreditCard size={20} color={COLORS.outline.default} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                    Phương thức thanh toán
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-2">
                    {payments.map((p, i) => (
                      <View key={i} className="rounded-lg bg-primary/10 px-3 py-1">
                        <Text className="text-sm font-bold text-primary">
                          {paymentMethodLabels[p.method] || p.method}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {order.voucherCode && (
                <View className="mt-4 w-[48%] flex-row items-center gap-4">
                  <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                    <Tag size={20} color={COLORS.primary.default} />
                  </View>
                  <View>
                    <Text
                      className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted"
                      numberOfLines={1}
                    >
                      Voucher
                    </Text>
                    <Text className="text-base font-black text-primary" numberOfLines={1}>
                      {order.voucherCode}
                    </Text>
                  </View>
                </View>
              )}

              {order.note && (
                <View className="mt-4 w-full flex-row items-center gap-4 border-t border-dashed border-outline-variant pt-6">
                  <View className="h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-white">
                    <Printer size={20} color={COLORS.outline.default} />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                      Ghi chú đơn hàng
                    </Text>
                    <Text className="mt-1 text-base font-medium italic text-surface-on">
                      {order.note}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Calculations Summary - Receipt Style */}
            <View className="mb-8 rounded-[32px] border border-outline-variant/50 bg-[#f8fafc] p-8">
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-medium text-muted">Tạm tính</Text>
                  <Text className="text-lg font-bold text-surface-on">
                    {formatCurrency(order.subtotal)}
                  </Text>
                </View>

                {order.discount > 0 && (
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg font-medium text-error">Giảm giá</Text>
                    </View>
                    <Text className="text-lg font-bold text-error">
                      -{formatCurrency(order.discount)}
                    </Text>
                  </View>
                )}

                {order.totalTax > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-medium text-muted">Thuế VAT</Text>
                    <Text className="text-lg font-bold text-surface-on">
                      {formatCurrency(order.totalTax)}
                    </Text>
                  </View>
                )}

                <View className="mt-4 flex-row items-center justify-between border-t border-outline-variant pt-6">
                  <Text className="text-2xl font-black uppercase tracking-tighter text-surface-on">
                    Tổng thanh toán
                  </Text>
                  <Text className="text-4xl font-black text-primary">
                    {formatCurrency(order.total)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items Table - Redesigned for Readability */}
            <View className="mb-8 overflow-hidden rounded-[32px] border border-outline-variant bg-white">
              <View className="flex-row bg-[#f1f5f9] px-8 py-5">
                <Text className="flex-1 text-xs font-black uppercase tracking-widest text-muted">
                  Chi tiết sản phẩm
                </Text>
                <Text className="w-20 text-center text-xs font-black uppercase tracking-widest text-muted">
                  Số lượng
                </Text>
                <Text className="w-24 text-center text-xs font-black uppercase tracking-widest text-muted">
                  Thuế
                </Text>
                <Text className="w-40 text-right text-xs font-black uppercase tracking-widest text-muted">
                  Thành tiền
                </Text>
              </View>

              {items.map((item, index) => (
                <View
                  key={index}
                  className="flex-row border-b border-outline-variant/50 px-8 py-6 last:border-b-0"
                >
                  {/* 1. Product Info */}
                  <View className="flex-1">
                    <Text className="text-lg font-black text-surface-on">{item.name}</Text>
                    <Text className="mt-1 text-xs font-bold text-muted">{item.sku}</Text>
                  </View>

                  {/* 2. Quantity */}
                  <View className="w-20 items-center justify-center">
                    <Text className="text-xl font-black text-surface-on">{item.quantity}</Text>
                  </View>

                  {/* 3. Tax Column */}
                  <View className="w-24 items-center justify-center">
                    {item.taxRate > 0 ? (
                      <View className="rounded-lg bg-surface-100 px-2 py-1">
                        <Text className="text-sm font-bold text-muted">{item.taxRate}%</Text>
                      </View>
                    ) : (
                      <Text className="text-sm font-bold text-muted/30">—</Text>
                    )}
                  </View>

                  {/* 4. Price & Subtotal */}
                  <View className="w-40 items-end justify-center">
                    <Text className="text-xl font-black text-primary" numberOfLines={1}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <Text className="text-xs font-medium text-muted" numberOfLines={1}>
                        {formatCurrency(item.price)}/món
                      </Text>
                      {item.discountAmount > 0 && (
                        <Text className="text-xs font-bold text-error" numberOfLines={1}>
                          (-{formatCurrency(item.discountAmount)})
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="flex-row items-center justify-between rounded-b-[40px] border-t border-outline-variant bg-[#f8fafc] p-8">
          <Button
            label={order.status === OrderStatus.REFUNDED ? 'Đã hoàn tiền' : 'Trả hàng'}
            variant="outline"
            leftIcon={Trash2}
            className="rounded-2xl border-error/30 bg-white"
            textClassName="text-error font-bold"
            disabled={order.status === OrderStatus.REFUNDED || order.status === OrderStatus.FAILED}
            onPress={() => {
              refundModalRef.current?.open(order)
              setVisible(false)
            }}
          />
          <Button
            label="In lại hóa đơn"
            leftIcon={Printer}
            className="h-16 rounded-2xl px-10"
            textClassName="text-xl font-black"
            onPress={handlePrint}
          />
        </View>
      </ModalBase>

      <RefundConfirmModal
        ref={refundModalRef}
        onSuccess={() => {
          // Khi hoàn tiền thành công, đóng modal chi tiết hoặc load lại data nếu cần
          setVisible(false)
        }}
      />
    </>
  )
}
