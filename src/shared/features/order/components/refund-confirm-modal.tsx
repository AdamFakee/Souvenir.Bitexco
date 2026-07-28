import { Button, Chip, ControlledInput, IconButton, ModalBase } from '@/shared/components/ui'
import { useAppStore } from '@/shared/features/app/store/use-app-store'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService } from '@/shared/services'
import { appSettings, toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { FlashList } from '@shopify/flash-list'
import { useMachine } from '@xstate/react'
import { X } from 'lucide-react-native'
import React, {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as v from 'valibot'
import { refundOrderMachine } from '../machines/refund-order.machine'
import { IOrder } from '../types'
import { RefundPaymentAllocation } from '../utils'
import { RefundReceiptTemplate } from './refund-receipt-template'
import { BusinessChecklistModal, BusinessChecklistModalRef } from './business-checklist-modal'

export interface RefundConfirmModalRef {
  open: (order: IOrder) => void
  close: () => void
}

const QUICK_REASONS = ['Khách đổi ý', 'Sản phẩm lỗi', 'Mua nhầm món']

const BRAND = '#1C4E68'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BORDER = '#DFE0E1'
const ERROR = '#DC2626'
const ZEBRA = '#FAFAFB'

const managerApprovalSchema = v.object({
  employeeCode: v.pipe(v.string(), v.minLength(1, 'Mã quản lý là bắt buộc')),
  pin: v.pipe(v.string(), v.minLength(1, 'PIN là bắt buộc')),
})

type ManagerApprovalFormData = v.InferOutput<typeof managerApprovalSchema>

interface RefundConfirmModalProps {
  onSuccess?: () => void
}

function PaymentCard({ payment }: { payment: RefundPaymentAllocation }) {
  return (
    <View
      className="mb-3 border bg-white p-4 shadow-sm"
      style={{
        borderRadius: 16,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-base font-extrabold"
          style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
        >
          {payment.label}
        </Text>
        <Text
          className="text-xl font-extrabold"
          style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
        >
          {formatCurrency(payment.amount)}
        </Text>
      </View>
    </View>
  )
}

const RefundItemRow = memo(function RefundItemRow({
  item,
  index,
}: {
  item: ItemSnapshot
  index: number
}) {
  const isEven = index % 2 === 0
  return (
    <View
      className="flex-row items-center px-5 py-4"
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: BORDER,
        backgroundColor: isEven ? '#fff' : ZEBRA,
      }}
    >
      <View className="flex-1 pr-3">
        <Text
          className="text-lg font-extrabold"
          style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {!!item.sku && (
          <Text
            className="mt-0.5 text-sm font-bold"
            style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
          >
            {item.sku}
          </Text>
        )}
      </View>
      <Text
        className="w-16 text-center text-lg font-extrabold"
        style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
      >
        {item.quantity}
      </Text>
      <Text
        className="w-28 text-right text-base font-bold"
        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        numberOfLines={1}
      >
        {formatCurrency(item.price)}
      </Text>
      <Text
        className="w-32 text-right text-lg font-extrabold"
        style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
        numberOfLines={1}
      >
        {formatCurrency(item.subtotal)}
      </Text>
    </View>
  )
})

/** Body + machine — chỉ mount khi modal visible */
const RefundModalBody = memo(function RefundModalBody({
  seedOrder,
  onClose,
  onSuccess,
}: {
  seedOrder: IOrder
  onClose: () => void
  onSuccess?: () => void
}) {
  const [state, send] = useMachine(refundOrderMachine)
  const receiptPrintRef = useRef(null)
  const printedReceiptKeyRef = useRef<string | null>(null)
  const businessChecklistModalRef = useRef<BusinessChecklistModalRef>(null)
  const [printReady, setPrintReady] = useState(false)
  const startedRef = useRef(false)

  const {
    order,
    reason,
    refundAmount,
    previewRefundAmount,
    refundPayments,
    result,
    managerAuthError,
    managerApprovalMessage,
  } = state.context

  const isWaitingManagerApproval = state.matches('waitingManagerApproval')
  const isSubmitting = state.matches('submittingReturn')
  const isProcessing = state.matches('submittingReturn') || state.matches('processing')
  const isDraft = state.matches('draft')
  const isCompleted = state.matches('completed')
  const receipt = result?.receipt

  const {
    control: managerControl,
    handleSubmit: handleManagerSubmit,
    reset: resetManagerForm,
    setError: setManagerError,
  } = useForm<ManagerApprovalFormData>({
    resolver: valibotResolver(managerApprovalSchema),
    defaultValues: { employeeCode: '', pin: '' },
  })

  // START 1 lần khi body mount — không block shell open
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const appContext = useAppStore.getState().appService?.getSnapshot().context
    send({
      type: 'START',
      order: seedOrder,
      shiftId: appContext?.cashSessionId || '',
      staffId: appContext?.employee?.id || '',
    })
  }, [seedOrder, send])

  useEffect(() => {
    if (managerAuthError) {
      setManagerError('pin', { type: 'manual', message: managerAuthError })
    }
  }, [managerAuthError, setManagerError])

  useEffect(() => {
    if (!isCompleted) return

    const receiptKey =
      receipt?.returnId || result?.returnId || result?.orderId || order?.id || 'refund'

    const closeAfterSuccess = async () => {
      try {
        if (receipt && printedReceiptKeyRef.current !== receiptKey) {
          printedReceiptKeyRef.current = receiptKey
          setPrintReady(true)
          await new Promise((r) => requestAnimationFrame(() => r(null)))
          if (receiptPrintRef.current) {
            await PrinterService.printComponent(receiptPrintRef)
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi in phiếu trả hàng')
      } finally {
        onSuccess?.()
        onClose()
      }
    }

    closeAfterSuccess()
  }, [isCompleted, receipt, result, order, onSuccess, onClose])

  const activeOrder = order || seedOrder
  const items = activeOrder.itemsSnapshot || []
  const displayRefundAmount = refundAmount || previewRefundAmount
  const cashPayment = refundPayments.find((p) => p.method === 'cash')
  const hasCashPortion = !!cashPayment && cashPayment.amount > 0
  const qrPayment = refundPayments.find((p) => p.method === 'qr_bidv')
  const hasQrPortion = !!qrPayment && qrPayment.amount > 0
  const cardPayment = refundPayments.find((p) => p.method === 'card_bidv')
  const hasCardPortion = !!cardPayment && cardPayment.amount > 0
  const orderCode = activeOrder.code || activeOrder.id?.substring(0, 8).toUpperCase() || ''

  const handleClose = useCallback(() => {
    if (isProcessing) return
    send({ type: 'RESET' })
    onClose()
  }, [isProcessing, send, onClose])

  const handleConfirm = useCallback(() => {
    if (!activeOrder) return

    if (appSettings.get('refundRequireChecklist')) {
      const checklistItems = [
        'Đã kiểm đếm và nhận lại đầy đủ số lượng sản phẩm trả hàng thực tế từ khách.',
      ]

      if (hasCashPortion && cashPayment) {
        checklistItems.push(
          `Đã chi trả trực tiếp số tiền mặt ${formatCurrency(cashPayment.amount)} cho khách.`,
        )
      }

      if (hasQrPortion && qrPayment) {
        checklistItems.push(
          `Đã hướng dẫn khách hàng: số tiền hoàn QR ${formatCurrency(qrPayment.amount)} sẽ được kế toán đối soát ngân hàng và chuyển khoản trả lại sau 7-10 ngày làm việc.`,
        )
      }

      if (hasCardPortion && cardPayment) {
        checklistItems.push(
          `Đã hướng dẫn và thực hiện thao tác VOID (hủy) giao dịch thẻ ${formatCurrency(cardPayment.amount)} thủ công trên máy POS vật lý.`,
        )
      }

      checklistItems.push(
        'Đồng ý cập nhật báo cáo doanh thu và đối soát két ca bán hàng trên hệ thống.',
      )

      businessChecklistModalRef.current?.open({
        title: 'Checklist xác nhận',
        subtitle: 'Xác nhận trước khi hoàn tất trả hàng toàn bộ đơn.',
        items: checklistItems,
        onDontShowAgain: () => appSettings.set('refundRequireChecklist', false),
        onConfirm: () => send({ type: 'SUBMIT' }),
      })
      return
    }

    toast.confirm({
      title: 'Xác nhận trả hàng',
      message: `Trả toàn bộ đơn #${orderCode} · hoàn ${formatCurrency(displayRefundAmount)}?`,
      onConfirm: () => send({ type: 'SUBMIT' }),
    })
  }, [
    activeOrder,
    hasCashPortion,
    cashPayment,
    hasQrPortion,
    qrPayment,
    hasCardPortion,
    cardPayment,
    orderCode,
    displayRefundAmount,
    send,
  ])

  const statusHint = useMemo(() => {
    if (state.matches('submittingReturn')) return 'Đang gửi yêu cầu trả hàng…'
    if (state.matches('processing')) return 'Đang hoàn tất…'
    if (state.matches('completed')) return 'Hoàn tất'
    return null
  }, [state])

  const renderItem = useCallback(
    ({ item, index }: { item: ItemSnapshot; index: number }) => (
      <RefundItemRow item={item} index={index} />
    ),
    [],
  )

  const onManagerSubmit = (data: ManagerApprovalFormData) => {
    send({
      type: 'SUBMIT_MANAGER_PIN',
      managerAuth: { employeeCode: data.employeeCode, pin: data.pin },
    })
  }

  const onManagerCancel = () => {
    resetManagerForm()
    send({ type: 'CANCEL' })
  }

  return (
    <>
      {printReady && receipt ? (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={receiptPrintRef}>
            <RefundReceiptTemplate receipt={receipt} />
          </View>
        </View>
      ) : null}

      <View className="flex-1">
        <View
          className="flex-row items-center justify-between px-6 py-5"
          style={{ borderBottomWidth: 1, borderColor: BORDER }}
        >
          <View className="flex-1 pr-4">
            <Text
              className="text-2xl font-extrabold"
              style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
            >
              Trả hàng
            </Text>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              <Text
                className="text-base font-bold"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                #{orderCode}
              </Text>
              {!!statusHint && (
                <Text
                  className="text-sm font-bold"
                  style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                >
                  {statusHint}
                </Text>
              )}
            </View>
          </View>
          <IconButton
            icon={X}
            size={28}
            color={TEXT_MUTED}
            onPress={handleClose}
            disabled={isProcessing}
          />
        </View>

        <View className="flex-1 flex-row">
          <View className="flex-[1.55]" style={{ borderRightWidth: 1, borderColor: BORDER }}>
            <View
              className="flex-row items-center px-5 py-3"
              style={{ borderBottomWidth: 1, borderColor: BORDER, backgroundColor: ZEBRA }}
            >
              <Text
                className="flex-1 text-sm font-extrabold uppercase tracking-wider"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                Sản phẩm
              </Text>
              <Text
                className="w-16 text-center text-sm font-extrabold uppercase tracking-wider"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                SL
              </Text>
              <Text
                className="w-28 text-right text-sm font-extrabold uppercase tracking-wider"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                Đơn giá
              </Text>
              <Text
                className="w-32 text-right text-sm font-extrabold uppercase tracking-wider"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                Thành tiền
              </Text>
            </View>

            <FlashList
              data={items}
              keyExtractor={(item, index) => item.productId || String(index)}
              renderItem={renderItem}
            />
          </View>

          <View className="flex-1 bg-gray-50">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 16,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                className="mb-3 text-base font-extrabold uppercase tracking-widest"
                style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
              >
                Cách hoàn tiền
              </Text>

              {refundPayments.length === 0 ? (
                <View
                  className="items-center justify-center rounded-2xl border p-4"
                  style={{
                    borderColor: 'rgba(220,38,38,0.15)',
                    backgroundColor: 'rgba(220,38,38,0.04)',
                  }}
                >
                  <Text
                    className="text-base font-extrabold"
                    style={{ color: ERROR, fontFamily: 'Manrope-Bold' }}
                  >
                    {isDraft
                      ? 'Không có phương thức hoàn trả hợp lệ!'
                      : 'Đang tính phương thức hoàn…'}
                  </Text>
                </View>
              ) : (
                refundPayments.map((p) => (
                  <PaymentCard key={`${p.method}-${p.amount}`} payment={p} />
                ))
              )}

              <View
                className="mt-2 flex-row items-center justify-between rounded-2xl border p-4 shadow-sm"
                style={{ borderColor: 'rgba(28,78,104,0.12)' }}
              >
                <Text
                  className="text-base font-extrabold uppercase tracking-wider"
                  style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                >
                  Tổng hoàn trả
                </Text>
                <Text
                  className="text-3xl font-extrabold"
                  style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                  numberOfLines={1}
                >
                  {formatCurrency(displayRefundAmount)}
                </Text>
              </View>

              <Text
                className="mb-3 mt-6 text-lg font-extrabold uppercase tracking-wider"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
              >
                Lý do (tuỳ chọn)
              </Text>

              <View className="mb-4 flex-row flex-wrap gap-2.5">
                {QUICK_REASONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    active={reason === r}
                    onPress={() => send({ type: 'SET_REASON', reason: r })}
                    className="h-13 justify-center self-start px-5"
                    textClassName="text-base font-bold"
                    disabled={!isDraft || isProcessing}
                  />
                ))}
              </View>

              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Ghi chú thêm nếu cần…"
                value={reason}
                onChangeText={(text) => send({ type: 'SET_REASON', reason: text })}
                className="min-h-[120px] rounded-2xl border px-5 py-4 text-lg"
                style={{
                  borderColor: BORDER,
                  backgroundColor: '#fff',
                  color: TEXT_PRIMARY,
                  fontFamily: 'Manrope-Bold',
                }}
                textAlignVertical="top"
                placeholderTextColor={TEXT_MUTED}
                editable={isDraft && !isProcessing}
              />
            </ScrollView>

            <View
              className="flex-row gap-3 px-6 py-4"
              style={{
                borderTopWidth: 1,
                borderColor: BORDER,
                backgroundColor: '#fff',
              }}
            >
              <Button
                label="Huỷ"
                variant="outline"
                className="h-14 flex-1 rounded-xl"
                onPress={handleClose}
                disabled={isProcessing}
              />
              <Button
                label={isProcessing ? statusHint || 'Đang xử lý…' : 'Xác nhận trả hàng'}
                variant="error"
                className="h-14 flex-[1.4] rounded-xl"
                onPress={handleConfirm}
                loading={isProcessing}
                disabled={!isDraft || refundPayments.length === 0}
              />
            </View>
          </View>
        </View>

        {(isWaitingManagerApproval || (isSubmitting && state.context.managerAuth !== null)) && (
          <View style={styles.managerOverlay}>
            <View style={styles.managerCard}>
              <Text style={styles.managerCardTitle}>Cần duyệt quản lý</Text>
              <Text style={styles.managerCardSubtitle}>
                {managerApprovalMessage || 'Nhập tài khoản và PIN quản lý để phê duyệt trả hàng.'}
              </Text>

              <View style={styles.managerFormGroup}>
                <ControlledInput
                  control={managerControl}
                  name="employeeCode"
                  label="Tài khoản quản lý"
                  placeholder="Mã nhân viên quản lý"
                />
                <ControlledInput
                  control={managerControl}
                  name="pin"
                  label="Mã PIN"
                  placeholder="PIN / mật khẩu"
                  secureTextEntry
                />
              </View>

              <View className="mt-1 flex-row gap-3">
                <Button
                  label="Huỷ"
                  variant="outline"
                  onPress={onManagerCancel}
                  className="h-14 flex-1 rounded-xl"
                  disabled={isSubmitting}
                />
                <Button
                  label="Xác nhận"
                  variant="primary"
                  onPress={handleManagerSubmit(onManagerSubmit)}
                  className="h-14 flex-1 rounded-xl"
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        )}

        <BusinessChecklistModal ref={businessChecklistModalRef} />
      </View>
    </>
  )
})

/**
 * Shell: open → native Modal paint ngay.
 * Body + XState machine chỉ mount khi visible (unmount khi đóng).
 */
export const RefundConfirmModal = memo(
  React.forwardRef<RefundConfirmModalRef, RefundConfirmModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false)
    const [seedOrder, setSeedOrder] = useState<IOrder | null>(null)

    useImperativeHandle(ref, () => ({
      open: (o: IOrder) => {
        setSeedOrder(o)
        setVisible(true)
      },
      close: () => {
        setVisible(false)
        setSeedOrder(null)
      },
    }))

    const handleClose = useCallback(() => {
      setVisible(false)
      setSeedOrder(null)
    }, [])

    if (!visible || !seedOrder) return null

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        dismissible={true}
        size="80%"
        className="overflow-hidden rounded-2xl bg-white"
      >
        <RefundModalBody seedOrder={seedOrder} onClose={handleClose} onSuccess={onSuccess} />
      </ModalBase>
    )
  }),
)

RefundConfirmModal.displayName = 'RefundConfirmModal'

const styles = StyleSheet.create({
  managerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    padding: 24,
  },
  managerCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  managerCardTitle: {
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    color: BRAND,
  },
  managerCardSubtitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  managerFormGroup: {
    gap: 12,
  },
})
