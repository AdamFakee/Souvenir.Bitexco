import { Button, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { PAYMENT_METHOD_LABELS } from '@/shared/features/payment'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useQueryClient } from '@tanstack/react-query'
import { Printer, Repeat2, Trash2, X } from 'lucide-react-native'
import React, { memo, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IOrder } from '../types'
import { checkCanExchange, checkCanReturn, getOrderDisplayStatus } from '../utils'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { ExchangeConfirmModal, ExchangeConfirmModalRef } from './exchange-confirm-modal'
import { RefundConfirmModal, RefundConfirmModalRef } from './refund-confirm-modal'
import { RefundReceiptTemplate } from './refund-receipt-template'

export interface OrderDetailModalRef {
  open: (order: IOrder) => void
  close: () => void
}

interface OrderDetailModalProps {
  ref?: React.Ref<OrderDetailModalRef>
}

export const OrderDetailModal = memo(function OrderDetailModal({ ref }: OrderDetailModalProps) {
  const queryClient = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState<IOrder | null>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)
  const exchangeModalRef = useRef<ExchangeConfirmModalRef>(null)
  const printRef = useRef(null)

  useImperativeHandle(ref, () => ({
    open: (o: IOrder) => {
      console.log('o', o)
      console.log('=== [ORDER DETAIL] ===', {
        id: o.id,
        returnId: o.refund?.lines,
        items: o.itemsSnapshot,

        code: o.code,
        status: o.status,
        state: o.state,
        canReturn: o.canReturn,
        checkCanReturn: checkCanReturn(o),
      })
      setOrder(o)
      setVisible(true)
    },
    close: () => setVisible(false),
  }))

  if (!order) return null

  const items = order.itemsSnapshot || []
  const payments = order.paymentsSnapshot || []
  const refundLines = order.refund?.lines || []
  const hasRefunds = !!order.refund || items.some((it) => (it.returnedQty || 0) > 0)

  // Dùng itemsSnapshot.returnedQty — có sẵn trong data API
  const getReturnedQty = (item: any): number => {
    if (typeof item.returnedQty === 'number') return item.returnedQty
    const fromRefund = refundLines
      .filter((l) => l.productId === item.productId)
      .reduce((sum, l) => sum + l.returnedQty, 0)
    return fromRefund
  }

  // Với đơn hoàn hàng (RT-), order.subtotal/total là của đơn gốc → dùng refundAmount.
  // Đơn thường (SO-) dùng order gốc vì đã bao gồm thuế.
  const isReturnOrder = !!order.refund || order.code?.startsWith('RT')
  const computedSubtotal = isReturnOrder
    ? items.reduce((sum, it) => sum + (it.subtotal || 0), 0)
    : order.subtotal
  const computedTax = isReturnOrder
    ? items.reduce((sum, it) => sum + (it.taxAmount || 0), 0)
    : order.totalTax
  const computedDiscount = isReturnOrder
    ? items.reduce((sum, it) => sum + (it.discountAmount || 0), 0)
    : order.discount
  const computedTotal = isReturnOrder ? (order.refund?.refundAmount ?? order.total) : order.total

  const displayStatus = getOrderDisplayStatus(order)
  const canExchange = checkCanExchange(order)

  const isRT = !!order.refund || order.code?.startsWith('RT')
  const resolvedRefund =
    order.refund ||
    (isRT
      ? {
          orderId: order.originalOrderId || order.id,
          orderCode: order.originalOrderCode || order.code || '',
          returnId: order.id,
          returnCode: order.code || '',
          reason: order.refundReason || '',
          refundedAt: order.createdAt
            ? typeof order.createdAt === 'string'
              ? order.createdAt
              : (order.createdAt as Date).toISOString()
            : new Date().toISOString(),
          refundAmount: order.total,
          lines: items.map((it) => ({
            productId: it.productId,
            sku: it.sku,
            name: it.name,
            orderedQty: (it.remainingQty || 0) + it.quantity,
            returnedQty: it.quantity,
            remainingQty: it.remainingQty || 0,
            unitPrice: it.price,
            lineRefundAmount: it.subtotal,
            isReturned: true,
          })),
        }
      : undefined)

  const handlePrint = async (doubleCopy: boolean = false) => {
    try {
      if (!printRef.current) return
      await PrinterService.printComponent(printRef, { doubleCopy })
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi in hóa đơn')
    }
  }
  return (
    <>
      {/* Hidden Container for Printing */}
      <View style={{ position: 'absolute', left: -2000, top: 0 }}>
        <View collapsable={false} ref={printRef}>
          {resolvedRefund ? (
            <RefundReceiptTemplate receipt={resolvedRefund} />
          ) : (
            <BitexcoReceiptTemplate order={order} />
          )}
        </View>
      </View>

      <ModalBase visible={visible} onClose={() => setVisible(false)} size="90%">
        {visible && (
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
                  {hasRefunds ? (
                    <>
                      <Text className="w-24 text-center text-sm font-black uppercase tracking-wider text-muted">
                        Đã mua
                      </Text>
                      <Text className="w-24 text-center text-sm font-black uppercase tracking-wider text-error">
                        Đã trả
                      </Text>
                      <Text className="w-24 text-center text-sm font-black uppercase tracking-wider text-primary">
                        Còn lại
                      </Text>
                      <Text className="w-32 text-center text-sm font-black uppercase tracking-wider text-muted">
                        Đơn giá
                      </Text>
                      <Text className="w-40 text-right text-sm font-black uppercase tracking-wider text-muted">
                        Thành tiền
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="w-24 text-center text-sm font-black uppercase tracking-wider text-muted">
                        Số lượng
                      </Text>
                      <Text className="w-40 text-center text-sm font-black uppercase tracking-wider text-muted">
                        Đơn giá
                      </Text>
                      <Text className="w-48 text-right text-sm font-black uppercase tracking-wider text-muted">
                        Thành tiền
                      </Text>
                    </>
                  )}
                </View>

                <FlashList
                  data={items}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item, index }) => {
                    const returnedQty = getReturnedQty(item)
                    const isRT = isReturnOrder
                    const refundLine = resolvedRefund?.lines?.find(
                      (l) => l.productId === item.productId,
                    )
                    const originalQty = isRT
                      ? (refundLine?.orderedQty ?? (item.remainingQty || 0) + (item.quantity || 0))
                      : item.quantity || 0
                    const remainingQty = isRT
                      ? (item.remainingQty ?? refundLine?.remainingQty)
                      : (item.remainingQty ?? originalQty - returnedQty)

                    return (
                      <View
                        key={index}
                        className="flex-row items-center border-b border-outline-variant px-10 py-8 active:bg-surface-100"
                      >
                        <View className="flex-1">
                          <Text className="text-2xl font-black text-surface-on">{item.name}</Text>
                          <Text className="mt-1 text-sm font-bold text-muted/60">{item.sku}</Text>
                        </View>
                        {hasRefunds ? (
                          <>
                            <View className="w-24 items-center">
                              <Text className="text-3xl font-black text-surface-on">
                                {originalQty}
                              </Text>
                            </View>
                            <View className="w-24 items-center">
                              <Text className="text-3xl font-black text-error">{returnedQty}</Text>
                            </View>
                            <View className="w-24 items-center">
                              <Text className="text-3xl font-black text-primary">
                                {remainingQty ?? 0}
                              </Text>
                            </View>
                            <View className="w-32 items-center">
                              <Text className="text-xl font-bold text-muted" numberOfLines={1}>
                                {formatCurrency(item.price)}
                              </Text>
                            </View>
                            <View className="w-40 items-end">
                              <Text className="text-2xl font-black text-primary" numberOfLines={1}>
                                {formatCurrency(item.subtotal)}
                              </Text>
                              {item.discountAmount > 0 && (
                                <Text
                                  className="mt-1 text-xs font-bold text-error"
                                  numberOfLines={1}
                                >
                                  -{formatCurrency(item.discountAmount)}
                                </Text>
                              )}
                            </View>
                          </>
                        ) : (
                          <>
                            <View className="w-24 items-center">
                              <Text className="text-3xl font-black text-surface-on">
                                {item.quantity}
                              </Text>
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
                                <Text
                                  className="mt-1 text-xs font-bold text-error"
                                  numberOfLines={1}
                                >
                                  -{formatCurrency(item.discountAmount)}
                                </Text>
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    )
                  }}
                />
              </View>

              {/* Right Side: Order Summary (Similar to CheckoutPanel) */}
              <View className="flex-1 border-l border-outline-variant bg-surface-50 p-10">
                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                  <Text className="mb-8 text-2xl font-black uppercase tracking-widest text-surface-on">
                    Thông tin đơn hàng
                  </Text>

                  {/* Summary Grid - Simple Rows */}
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                      <Text className="w-36 text-lg font-bold text-muted">Mã đơn</Text>
                      <Text className="text-xl font-black text-primary" numberOfLines={1}>
                        #{order.code || order.id.substring(0, 8).toUpperCase()}
                      </Text>
                    </View>

                    {order.originalOrderCode && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="w-36 text-lg font-bold text-muted">Đơn gốc</Text>
                        <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                          #{order.originalOrderCode}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                      <Text className="w-36 text-lg font-bold text-muted">Thời gian</Text>
                      <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                        {order.createdAt.toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {order.staffName && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="w-36 text-lg font-bold text-muted">Nhân viên</Text>
                        <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                          {order.staffName}
                        </Text>
                      </View>
                    )}

                    {order.affiliate && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="w-36 text-lg font-bold text-muted">Cộng tác viên</Text>
                        <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                          {order.affiliate.name}
                        </Text>
                      </View>
                    )}

                    {order.partner && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="w-36 text-lg font-bold text-muted">Đại lý</Text>
                        <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                          {order.partner.nameVi}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                      <Text className="w-36 text-lg font-bold text-muted">Trạng thái</Text>
                      <View
                        className="rounded-full px-4 py-1"
                        style={{ backgroundColor: displayStatus.bgColor }}
                      >
                        <Text
                          className="text-sm font-black uppercase tracking-widest"
                          style={{ color: displayStatus.color }}
                          numberOfLines={1}
                        >
                          {displayStatus.label}
                        </Text>
                      </View>
                    </View>

                    {payments.map((p, i) => (
                      <View
                        key={i}
                        className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4"
                      >
                        <Text className="text-lg font-bold text-muted" numberOfLines={1}>
                          {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        </Text>
                        <Text className="text-lg font-black text-surface-on" numberOfLines={1}>
                          {formatCurrency(p.amount)}
                        </Text>
                      </View>
                    ))}

                    {order.voucherCode && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="w-36 text-lg font-bold text-muted">Voucher</Text>
                        <Text
                          className="text-lg font-black uppercase text-primary"
                          numberOfLines={1}
                        >
                          {order.voucherCode}
                        </Text>
                      </View>
                    )}

                    {order.note && (
                      <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                        <Text className="mb-1 text-lg font-bold text-muted">Ghi chú</Text>
                        <Text className="text-base italic leading-relaxed text-surface-on">
                          {order.note}
                        </Text>
                      </View>
                    )}

                    {(order.refund || (order.totalRefunded && order.totalRefunded > 0)) && (
                      <View className="mt-2 border-t-2 border-outline-variant pt-5">
                        <Text className="mb-4 text-base font-black uppercase tracking-widest text-error">
                          Thông tin trả hàng
                        </Text>

                        {order.refund?.reason ||
                        order.refundReason ||
                        order.refunds?.[0]?.reason ? (
                          <View className="mb-2">
                            <Text className="text-base font-bold text-muted">Lý do</Text>
                            <Text className="mt-1 text-base font-medium leading-snug text-surface-on">
                              {order.refund?.reason ||
                                order.refundReason ||
                                order.refunds?.[0]?.reason}
                            </Text>
                          </View>
                        ) : null}

                        {order.refund?.refundedAt ||
                        order.refunds?.[0]?.refundedAt ||
                        order.updatedAt ? (
                          <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant py-3">
                            <Text className="text-lg font-bold text-muted">Ngày trả</Text>
                            <Text
                              className="text-base font-black text-surface-on"
                              numberOfLines={1}
                            >
                              {new Date(
                                order.refund?.refundedAt ||
                                  order.refunds?.[0]?.refundedAt ||
                                  order.updatedAt,
                              ).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        ) : null}

                        <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant py-3">
                          <Text className="text-lg font-bold text-muted">Tổng số món gốc</Text>
                          <Text className="text-base font-black text-surface-on" numberOfLines={1}>
                            {isReturnOrder
                              ? items.reduce(
                                  (sum, it) => sum + (it.remainingQty ?? 0) + (it.quantity ?? 0),
                                  0,
                                )
                              : items.reduce((sum, it) => sum + (it.quantity ?? 0), 0)}{' '}
                            món
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant py-3">
                          <Text className="text-lg font-bold text-muted">Số món đã trả</Text>
                          <Text className="text-base font-black text-error" numberOfLines={1}>
                            {items.reduce((sum, it) => sum + getReturnedQty(it), 0)} món
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant py-3">
                          <Text className="text-lg font-bold text-muted">Số món còn lại</Text>
                          <Text className="text-base font-black text-primary" numberOfLines={1}>
                            {items.reduce(
                              (sum, it) =>
                                sum + (it.remainingQty ?? it.quantity - getReturnedQty(it)),
                              0,
                            )}{' '}
                            món
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant py-3">
                          <Text className="text-lg font-bold text-muted">Tiền hoàn</Text>
                          <Text className="text-2xl font-black text-error" numberOfLines={1}>
                            {formatCurrency(order.totalRefunded || order.refund?.refundAmount || 0)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Totals Section - Computed from itemsSnapshot for consistency */}
                  <View className="mt-12 gap-5 border-t-2 border-outline-variant pt-8">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-bold text-muted">Tạm tính</Text>
                      <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
                        {formatCurrency(computedSubtotal)}
                      </Text>
                    </View>

                    {computedDiscount > 0 && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xl font-bold text-error">Giảm giá</Text>
                        <Text className="text-2xl font-black text-error" numberOfLines={1}>
                          -{formatCurrency(computedDiscount)}
                        </Text>
                      </View>
                    )}

                    {computedTax > 0 && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xl font-bold text-muted">Thuế VAT</Text>
                        <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
                          {formatCurrency(computedTax)}
                        </Text>
                      </View>
                    )}

                    <View className="mt-4 flex-row items-center justify-between border-t-2 border-outline-variant pt-6">
                      <Text className="text-2xl font-black uppercase tracking-tighter text-surface-on">
                        Tổng thanh toán
                      </Text>
                      <Text className="text-6xl font-black text-primary">
                        {formatCurrency(computedTotal)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Action Buttons - POS Style */}
                <View className="mt-10 flex-row justify-end gap-6">
                  <Button
                    label="Đổi hàng"
                    variant="outline"
                    leftIcon={Repeat2}
                    className="h-16 rounded-2xl"
                    disabled={!canExchange}
                    onPress={() => {
                      exchangeModalRef.current?.open(order)
                      setVisible(false)
                    }}
                  />
                  <Button
                    label={
                      ['REFUNDED', 'RETURNED'].includes(order.status) ? 'Đã hoàn tiền' : 'Trả hàng'
                    }
                    variant="outline"
                    leftIcon={Trash2}
                    className="h-16 rounded-2xl"
                    disabled={!checkCanReturn(order)}
                    onPress={() => {
                      refundModalRef.current?.open(order)
                      setVisible(false)
                    }}
                  />
                  <Button
                    label="In 1 liên"
                    variant="outline"
                    leftIcon={Printer}
                    className="h-16 rounded-2xl border-primary px-8"
                    textClassName="text-xl font-black text-primary"
                    onPress={() => handlePrint(false)}
                  />
                  <Button
                    label="In 2 liên"
                    leftIcon={Printer}
                    className="h-16 rounded-2xl px-8"
                    textClassName="text-xl font-black"
                    onPress={() => handlePrint(true)}
                  />
                </View>
              </View>
            </View>
          </SafeAreaView>
        )}
      </ModalBase>

      <RefundConfirmModal
        ref={refundModalRef}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          setVisible(false)
        }}
      />

      <ExchangeConfirmModal
        ref={exchangeModalRef}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          setVisible(false)
        }}
      />
    </>
  )
})

export default OrderDetailModal
