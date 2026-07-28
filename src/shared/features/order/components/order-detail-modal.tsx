import { Button, IconButton, ModalBase } from '@/shared/components/ui'
import { PAYMENT_METHOD_LABELS } from '@/shared/features/payment/types/payment.constants'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Copy, Printer, X } from 'lucide-react-native'
import React, {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Clipboard, Pressable, ScrollView, Text, View } from 'react-native'
import { IOrder } from '../types'
import { getOrderDisplayStatus } from '../utils'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { RefundReceiptTemplate } from './refund-receipt-template'

const BRAND = '#1C4E68'
const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'

export interface OrderDetailModalRef {
  open: (order: IOrder) => void
  close: () => void
}

interface OrderDetailModalProps {
  ref?: React.Ref<OrderDetailModalRef>
}

export const OrderDetailModal = memo(function OrderDetailModal({ ref }: OrderDetailModalProps) {
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState<IOrder | null>(null)
  // Shell paint trước — order gắn frame sau để tránh jank lúc bấm
  const [ready, setReady] = useState(false)
  const [printReady, setPrintReady] = useState(false)
  const pendingOrderRef = useRef<IOrder | null>(null)
  const printRef = useRef(null)

  useImperativeHandle(ref, () => ({
    open: (o: IOrder) => {
      console.log('[OrderDetailModal] open - order details:', JSON.stringify(o, null, 2))
      pendingOrderRef.current = o
      setOrder(null)
      setReady(false)
      setPrintReady(false)
      setVisible(true)
    },
    close: () => {
      pendingOrderRef.current = null
      setVisible(false)
      setOrder(null)
      setReady(false)
      setPrintReady(false)
    },
  }))

  useEffect(() => {
    if (!visible) return
    const id = requestAnimationFrame(() => {
      setOrder(pendingOrderRef.current)
      setReady(true)
    })
    return () => cancelAnimationFrame(id)
  }, [visible])

  const close = useCallback(() => {
    pendingOrderRef.current = null
    setVisible(false)
    setOrder(null)
    setReady(false)
    setPrintReady(false)
  }, [])

  const items = order?.itemsSnapshot || []
  const payments = order?.paymentsSnapshot || []
  const refundLines = order?.refund?.lines || []
  const hasRefunds = !!order?.refund || items.some((it) => (it.returnedQty || 0) > 0)

  const getReturnedQty = useCallback(
    (item: any): number => {
      if (typeof item.returnedQty === 'number') return item.returnedQty
      return refundLines
        .filter((l) => l.productId === item.productId)
        .reduce((sum, l) => sum + l.returnedQty, 0)
    },
    [refundLines],
  )

  const isRT = !!order?.refund || !!order?.code?.startsWith('RT')
  const isReturnOrder = isRT

  const computed = useMemo(() => {
    if (!order) {
      return { subtotal: 0, tax: 0, discount: 0, total: 0 }
    }
    if (!isReturnOrder) {
      return {
        subtotal: (order.total || 0) + order.discount,
        tax: order.totalTax,
        discount: order.discount,
        total: order.total,
      }
    }
    return {
      subtotal: items.reduce((sum, it) => sum + (it.subtotal || 0), 0),
      tax: items.reduce((sum, it) => sum + (it.taxAmount || 0), 0),
      discount: items.reduce((sum, it) => sum + (it.discountAmount || 0), 0),
      total: order.refund?.refundAmount ?? order.total,
    }
  }, [order, items, isReturnOrder])

  const displayStatus = useMemo(() => (order ? getOrderDisplayStatus(order) : null), [order])

  const resolvedRefund = useMemo(() => {
    if (!order) return undefined
    if (order.refund) return order.refund
    if (!isRT) return undefined
    return {
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
  }, [order, isRT, items])

  const totalOriginalQty = useMemo(() => {
    if (!order) return 0
    if (isRT) {
      return items.reduce((sum, it) => {
        const refundLine = resolvedRefund?.lines?.find((l) => l.productId === it.productId)
        return sum + (refundLine?.orderedQty ?? (it.remainingQty || 0) + (it.quantity || 0))
      }, 0)
    }
    return items.reduce((sum, it) => sum + (it.quantity || 0), 0)
  }, [order, isRT, items, resolvedRefund])

  const totalReturnedQty = useMemo(() => {
    if (!order) return 0
    if (isRT) return items.reduce((sum, it) => sum + (it.quantity || 0), 0)
    return items.reduce((sum, it) => sum + getReturnedQty(it), 0)
  }, [order, isRT, items, getReturnedQty])

  const handlePrint = useCallback(async (doubleCopy = false) => {
    try {
      setPrintReady(true)
      // 1 frame để ref attach
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (!printRef.current) return
      await PrinterService.printComponent(printRef, { doubleCopy })
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi in hóa đơn')
    }
  }, [])

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const returnedQty = getReturnedQty(item)
      const refundLine = resolvedRefund?.lines?.find((l) => l.productId === item.productId)
      const originalQty = isRT
        ? (refundLine?.orderedQty ?? (item.remainingQty || 0) + (item.quantity || 0))
        : item.quantity || 0
      const remainingQty = isRT
        ? (item.remainingQty ?? refundLine?.remainingQty ?? 0)
        : (item.remainingQty ?? originalQty - returnedQty)
      const isEven = index % 2 === 0

      return (
        <View
          className="flex-row items-center px-5 py-4"
          style={{
            borderBottomWidth: 0.5,
            borderColor: BORDER,
            backgroundColor: isEven ? '#fff' : '#FAFAFB',
          }}
        >
          <View className="flex-1">
            <Text
              className="text-xl font-extrabold"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text
              className="mt-0.5 text-base font-bold"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              {item.sku}
            </Text>
          </View>
          {hasRefunds ? (
            <>
              <View className="w-20 items-center">
                <Text
                  className="text-xl font-extrabold"
                  style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                >
                  {originalQty}
                </Text>
              </View>
              <View className="w-20 items-center">
                <Text
                  className="text-xl font-extrabold"
                  style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                >
                  {returnedQty}
                </Text>
              </View>
              <View className="w-20 items-center">
                <Text
                  className="text-xl font-extrabold"
                  style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                >
                  {remainingQty ?? 0}
                </Text>
              </View>
            </>
          ) : (
            <View className="w-20 items-center">
              <Text
                className="text-xl font-extrabold"
                style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
              >
                {item.quantity}
              </Text>
            </View>
          )}
          <View className="w-28 items-end">
            <Text
              className="text-lg font-bold"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              numberOfLines={1}
            >
              {formatCurrency(item.price)}
            </Text>
          </View>
          <View className="w-32 items-end">
            <Text
              className="text-xl font-extrabold"
              style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
              numberOfLines={1}
            >
              {formatCurrency(item.subtotal)}
            </Text>
            {item.discountAmount > 0 && (
              <Text
                className="mt-0.5 text-sm font-bold"
                style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
              >
                -{formatCurrency(item.discountAmount)}
              </Text>
            )}
          </View>
        </View>
      )
    },
    [getReturnedQty, resolvedRefund, isRT, hasRefunds],
  )

  if (!visible) return null

  const headerCode =
    order?.code ||
    order?.id?.substring(0, 8).toUpperCase() ||
    pendingOrderRef.current?.code ||
    pendingOrderRef.current?.id?.substring(0, 8).toUpperCase() ||
    ''

  const showBody = ready && !!order && !!displayStatus

  return (
    <>
      {/* Receipt chỉ mount khi bấm In — không block open */}
      {printReady && order ? (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={printRef}>
            {resolvedRefund ? (
              <RefundReceiptTemplate receipt={resolvedRefund} />
            ) : (
              <BitexcoReceiptTemplate order={order} />
            )}
          </View>
        </View>
      ) : null}

      <ModalBase
        visible={visible}
        onClose={close}
        size="90%"
        className="overflow-hidden rounded-2xl bg-white"
        dismissible={true}
      >
        <View className="flex-1">
          {/* ── Header ── */}
          <View
            className="flex-row items-center justify-between px-6 py-5"
            style={{ borderBottomWidth: 1, borderColor: BORDER }}
          >
            <View className="flex-1">
              <View>
                <Text
                  className="text-2xl font-extrabold"
                  style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                >
                  Chi tiết đơn hàng
                </Text>
                <Pressable
                  onPress={() => {
                    const code = order?.code || order?.id || pendingOrderRef.current?.code || ''
                    if (!code) return
                    Clipboard.setString(code)
                    toast.success('Đã sao chép mã đơn hàng')
                  }}
                  className="flex-row items-center gap-1.5 active:opacity-60"
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                  >
                    #{headerCode}
                  </Text>
                  <Copy size={14} color={TEXT_MUTED} />
                </Pressable>
              </View>
            </View>
            <IconButton icon={X} size={28} color={TEXT_MUTED} onPress={close} />
          </View>

          {!showBody || !order || !displayStatus ? (
            <View className="flex-1 items-center justify-center">
              <Text style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}>Đang tải…</Text>
            </View>
          ) : (
            <View className="flex-1 flex-row">
              {/* Left: product list */}
              <View className="flex-[1.5]" style={{ borderRightWidth: 1, borderColor: BORDER }}>
                {/* Table header */}
                <View
                  className="flex-row items-center px-5 py-3"
                  style={{ borderBottomWidth: 1, borderColor: BORDER, backgroundColor: '#FAFAFB' }}
                >
                  <Text
                    className="flex-1 text-base font-extrabold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                  >
                    Sản phẩm
                  </Text>
                  {hasRefunds ? (
                    <>
                      <Text
                        className="w-20 text-center text-base font-extrabold uppercase tracking-wider"
                        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                      >
                        Gốc
                      </Text>
                      <Text
                        className="w-20 text-center text-base font-extrabold uppercase tracking-wider"
                        style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                      >
                        Đã trả
                      </Text>
                      <Text
                        className="w-20 text-center text-base font-extrabold uppercase tracking-wider"
                        style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                      >
                        Còn
                      </Text>
                    </>
                  ) : (
                    <Text
                      className="w-20 text-center text-base font-extrabold uppercase tracking-wider"
                      style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                    >
                      SL
                    </Text>
                  )}
                  <Text
                    className="w-28 text-right text-base font-extrabold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                  >
                    Đơn giá
                  </Text>
                  <Text
                    className="w-32 text-right text-base font-extrabold uppercase tracking-wider"
                    style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                  >
                    Thành tiền
                  </Text>
                </View>

                <FlashList
                  data={items}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={renderItem}
                />
              </View>

              {/* Right: summary */}
              <View className="flex-1 bg-gray-50">
                <ScrollView className="flex-1 px-6 pb-20 pt-5" showsVerticalScrollIndicator={false}>
                  <Text
                    className="mb-6 text-xl font-extrabold uppercase tracking-widest"
                    style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                  >
                    Thông tin đơn hàng
                  </Text>

                  <View style={{ gap: 4 }}>
                    <InfoRow
                      label="Mã đơn"
                      value={`#${order.code || order.id.substring(0, 8).toUpperCase()}`}
                      onPress={() => {
                        const code = order.code || order.id
                        Clipboard.setString(code)
                        toast.success('Đã sao chép mã đơn hàng')
                      }}
                    />
                    {!!order.originalOrderCode && (
                      <InfoRow
                        label="Đơn gốc"
                        value={`#${order.originalOrderCode}`}
                        onPress={() => {
                          Clipboard.setString(order.originalOrderCode || '')
                          toast.success('Đã sao chép mã đơn gốc')
                        }}
                      />
                    )}
                    <InfoRow
                      label="Thời gian"
                      value={order.createdAt.toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    />
                    {!!order.staffName && <InfoRow label="Nhân viên" value={order.staffName} />}
                    {!!order.affiliate && (
                      <InfoRow label="Cộng tác viên" value={order.affiliate.name} />
                    )}
                    {!!order.partner && <InfoRow label="Đại lý" value={order.partner.nameVi} />}

                    <View className="mt-1 flex-row items-center justify-between py-2">
                      <Text
                        className="text-base font-bold"
                        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                      >
                        Trạng thái
                      </Text>
                      <View
                        className="rounded-full px-4 py-1.5"
                        style={{ backgroundColor: displayStatus.bgColor }}
                      >
                        <Text
                          className="text-sm font-extrabold uppercase tracking-wide"
                          style={{ color: displayStatus.color, fontFamily: 'Manrope-Bold' }}
                          numberOfLines={1}
                        >
                          {displayStatus.label}
                        </Text>
                      </View>
                    </View>

                    {payments.map((p, i) => (
                      <React.Fragment key={i}>
                        <InfoRow
                          label={PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                          value={formatCurrency(p.amount)}
                        />
                        {p.method === 'cash' && p.cashTendered !== undefined && (
                          <View
                            className="flex-row items-center justify-between py-1.5 pl-4"
                            style={{ borderBottomWidth: 0.5, borderColor: '#e5e7eb' }}
                          >
                            <Text
                              className="text-base font-bold"
                              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                            >
                              Khách đưa
                            </Text>
                            <Text
                              className="text-base font-extrabold"
                              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                            >
                              {formatCurrency(p.cashTendered)}
                            </Text>
                          </View>
                        )}
                        {p.method === 'cash' && p.cashChange !== undefined && (
                          <View
                            className="flex-row items-center justify-between py-1.5 pl-4"
                            style={{ borderBottomWidth: 0.5, borderColor: '#e5e7eb' }}
                          >
                            <Text
                              className="text-base font-bold"
                              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                            >
                              Tiền thừa
                            </Text>
                            <Text
                              className="text-base font-extrabold"
                              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                            >
                              {formatCurrency(p.cashChange)}
                            </Text>
                          </View>
                        )}
                      </React.Fragment>
                    ))}

                    {!!order.voucherCode && (
                      <InfoRow label="Voucher" value={order.voucherCode} valueColor={BRAND} />
                    )}

                    {!!order.note && <InfoRow label="Ghi chú" value={order.note} />}

                    {!!(order.refund || (order.totalRefunded && order.totalRefunded > 0)) && (
                      <View
                        className="mt-4"
                        style={{ borderTopWidth: 2, borderColor: BORDER, paddingTop: 16 }}
                      >
                        <Text
                          className="mb-4 text-base font-extrabold uppercase tracking-widest"
                          style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                        >
                          Thông tin trả hàng
                        </Text>
                        {!!(
                          order.refund?.reason ||
                          order.refundReason ||
                          order.refunds?.[0]?.reason
                        ) && (
                          <InfoRow
                            label="Lý do"
                            value={
                              order.refund?.reason ||
                              order.refundReason ||
                              order.refunds?.[0]?.reason ||
                              ''
                            }
                          />
                        )}
                        <InfoRow
                          label="Ngày trả"
                          value={new Date(
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
                        />
                        <InfoRow label="Tổng số món gốc" value={`${totalOriginalQty} món`} />
                        <InfoRow
                          label="Số món đã trả"
                          value={`${totalReturnedQty} món`}
                          valueColor="#DC2626"
                        />
                        <InfoRow
                          label="Số món còn lại"
                          value={`${
                            isRT
                              ? items.reduce((sum, it) => sum + (it.remainingQty || 0), 0)
                              : items.reduce(
                                  (sum, it) =>
                                    sum + (it.remainingQty ?? it.quantity - getReturnedQty(it)),
                                  0,
                                )
                          } món`}
                          valueColor={BRAND}
                        />
                        <InfoRow
                          label="Tiền hoàn"
                          value={formatCurrency(
                            order.totalRefunded || order.refund?.refundAmount || 0,
                          )}
                          valueColor="#DC2626"
                          large
                        />
                      </View>
                    )}
                  </View>

                  {/* Totals */}
                  <View
                    className="mt-8"
                    style={{ borderTopWidth: 2, borderColor: BORDER, paddingTop: 20 }}
                  >
                    <View className="mb-4 flex-row items-center justify-between">
                      <Text
                        className="text-xl font-bold"
                        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                      >
                        Tạm tính
                      </Text>
                      <Text
                        className="text-xl font-extrabold"
                        style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                        numberOfLines={1}
                      >
                        {formatCurrency(computed.subtotal)}
                      </Text>
                    </View>
                    {computed.discount > 0 && (
                      <View className="mb-4 flex-row items-center justify-between">
                        <Text
                          className="text-xl font-bold"
                          style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                        >
                          Giảm giá
                        </Text>
                        <Text
                          className="text-xl font-extrabold"
                          style={{ color: '#DC2626', fontFamily: 'Manrope-Bold' }}
                        >
                          -{formatCurrency(computed.discount)}
                        </Text>
                      </View>
                    )}
                    {computed.tax > 0 && (
                      <View className="mb-4 flex-row items-center justify-between">
                        <Text
                          className="text-xl font-bold"
                          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
                        >
                          Thuế VAT
                        </Text>
                        <Text
                          className="text-xl font-extrabold"
                          style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                          numberOfLines={1}
                        >
                          {formatCurrency(computed.tax)}
                        </Text>
                      </View>
                    )}
                    <View
                      className="mt-4 flex-row items-center justify-between"
                      style={{
                        borderTopWidth: 2,
                        borderColor: BORDER,
                        paddingTop: 16,
                        paddingBottom: 60,
                      }}
                    >
                      <Text
                        className="text-2xl font-extrabold uppercase tracking-tight"
                        style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                      >
                        Tổng thanh toán
                      </Text>
                      <Text
                        className="text-4xl font-extrabold"
                        style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                      >
                        {formatCurrency(computed.total)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Action buttons — đổi/trả trên list; detail chỉ in */}
                <View
                  className="flex-row justify-end gap-4 px-6 py-5"
                  style={{ borderTopWidth: 1, borderColor: BORDER, backgroundColor: '#fff' }}
                >
                  <Button
                    label="In 1 liên"
                    variant="outline"
                    leftIcon={Printer}
                    className="h-14 rounded-xl"
                    onPress={() => handlePrint(false)}
                  />
                  <Button
                    label="In 2 liên"
                    leftIcon={Printer}
                    className="h-14 rounded-xl"
                    onPress={() => handlePrint(true)}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </ModalBase>
    </>
  )
})

// ── Tiny info row helper ──
function InfoRow({
  label,
  value,
  valueColor,
  large,
  onPress,
}: {
  label: string
  value: string
  valueColor?: string
  large?: boolean
  onPress?: () => void
}) {
  const Container = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      className="flex-row items-center justify-between py-2.5"
      style={{ borderBottomWidth: 0.5, borderColor: '#e5e7eb' }}
    >
      <Text className="text-lg font-bold" style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}>
        {label}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Text
          className={large ? 'text-2xl font-extrabold' : 'text-lg font-extrabold'}
          style={{ color: valueColor || TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {onPress && <Copy size={16} color={valueColor || TEXT_MUTED} />}
      </View>
    </Container>
  )
}

export default OrderDetailModal
