import {
  Button,
  Checkbox,
  Chip,
  IconButton,
  ModalBase,
  QuantityStepper,
} from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppStore } from '@/shared/features/app'
import { roundCashAmount } from '@/shared/features/payment/utils/cash.utils'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useMachine } from '@xstate/react'
import { X } from 'lucide-react-native'
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { refundOrderMachine } from '../machines/refund-order.machine'
import { IOrder } from '../types'
import { RefundReceiptTemplate } from './refund-receipt-template'

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
    const receiptPrintRef = useRef(null)
    const printedReceiptKeyRef = useRef<string | null>(null)

    const { order, reason, lines, refundAmount, result } = state.context
    const isProcessing =
      state.matches('submittingReturn') ||
      state.matches('receivingReturnedItems') ||
      state.matches('refundProcessing')
    const isDraft = state.matches('draft')
    const isCompleted = state.matches('completed')
    const receipt = result?.receipt

    const getLineQty = useCallback(
      (productId: string) => {
        return lines.find((line) => line.productId === productId)?.qty ?? 0
      },
      [lines],
    )

    const previewRefundAmount = useMemo(() => {
      if (!order) return 0

      return (order.itemsSnapshot || []).reduce((total, item) => {
        const qty = getLineQty(item.productId)
        if (qty <= 0 || item.quantity <= 0) return total
        return total + (item.subtotal / item.quantity) * qty
      }, 0)
    }, [order, getLineQty])

    const roundedPreviewRefundAmount = roundCashAmount(previewRefundAmount)

    const selectedItemCount = lines.filter((line) => line.qty > 0).length
    const itemCount = order?.itemsSnapshot?.reduce((acc, item) => acc + item.quantity, 0) || 0
    const displayRefundAmount = refundAmount || roundedPreviewRefundAmount

    useImperativeHandle(ref, () => ({
      open: (o: IOrder) => {
        const appContext = useAppStore.getState().appService?.getSnapshot().context
        const shiftId = appContext?.cashSessionId || ''
        const staffId = appContext?.employee?.id || ''

        printedReceiptKeyRef.current = null
        send({ type: 'RESET' })
        send({ type: 'START', order: o, shiftId, staffId })
        setVisible(true)
      },
      close: () => {
        if (isProcessing) return
        setVisible(false)
        send({ type: 'RESET' })
      },
    }))

    useEffect(() => {
      if (!isCompleted) return

      const receiptKey =
        receipt?.returnId || result?.returnId || result?.orderId || order?.id || 'refund'
      const closeAfterSuccess = async () => {
        try {
          if (receipt && receiptPrintRef.current && printedReceiptKeyRef.current !== receiptKey) {
            printedReceiptKeyRef.current = receiptKey
            await PrinterService.printComponent(receiptPrintRef)
          }
        } catch (error: any) {
          toast.error(error.message || 'Lỗi khi in phiếu trả hàng')
        } finally {
          setVisible(false)
          onSuccess?.()
          setTimeout(() => send({ type: 'RESET' }), 300)
        }
      }

      closeAfterSuccess()
    }, [isCompleted, receipt, result, order, onSuccess, send])

    const handleClose = () => {
      if (isProcessing) return
      setVisible(false)
      send({ type: 'RESET' })
    }

    const handleConfirm = () => {
      if (!order) return

      toast.confirm({
        title: 'Xác nhận trả hàng',
        message: `Bạn có chắc chắn muốn trả ${selectedItemCount} sản phẩm và hoàn ${formatCurrency(
          roundedPreviewRefundAmount,
        )} không?`,
        onConfirm: () => {
          send({ type: 'SUBMIT' })
        },
      })
    }

    const handleToggleItem = (item: ItemSnapshot) => {
      const currentQty = getLineQty(item.productId)
      if (currentQty > 0) {
        send({ type: 'CLEAR_LINE', productId: item.productId })
        return
      }

      send({ type: 'SET_LINE_QTY', productId: item.productId, qty: 1 })
    }

    const allSelected = useMemo(() => {
      if (!order || !order.itemsSnapshot || order.itemsSnapshot.length === 0) return false
      return order.itemsSnapshot.every((item) => getLineQty(item.productId) > 0)
    }, [order, getLineQty])

    const handleToggleAll = () => {
      if (allSelected) {
        order?.itemsSnapshot?.forEach((item) => {
          send({ type: 'CLEAR_LINE', productId: item.productId })
        })
      } else {
        send({ type: 'SET_ALL_LINES' })
      }
    }

    const handleChangeQty = (item: ItemSnapshot, nextQty: number) => {
      send({ type: 'SET_LINE_QTY', productId: item.productId, qty: nextQty })
    }

    const getStepText = () => {
      if (state.matches('submittingReturn')) return 'Đang xử lý trả hàng...'
      if (state.matches('receivingReturnedItems')) return 'Đang nhập kho hàng trả...'
      if (state.matches('refundProcessing')) return 'Đang hoàn tiền...'
      if (state.matches('completed')) return 'Trả hàng hoàn tất'
      return 'Chọn sản phẩm và số lượng cần trả'
    }

    if (!order) return null

    return (
      <>
        {receipt && (
          <View style={{ position: 'absolute', left: -2000, top: 0 }}>
            <View collapsable={false} ref={receiptPrintRef}>
              <RefundReceiptTemplate receipt={receipt} />
            </View>
          </View>
        )}

        <ModalBase visible={visible} onClose={handleClose} dismissible={!isProcessing} size="90%">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
              <View>
                <Text className="text-3xl font-black tracking-tight text-surface-on">Trả hàng</Text>
                <Text className="mt-1 text-base font-bold text-muted">{getStepText()}</Text>
              </View>
              <IconButton
                icon={X}
                size={32}
                color={COLORS.surface.onVariant}
                onPress={handleClose}
                disabled={isProcessing}
              />
            </View>

            <View className="flex-1 flex-row">
              <View className="flex-[1.6] bg-white">
                <View className="flex-row items-center border-b border-outline-variant bg-[#f8fafc] px-10 py-5">
                  <View className="w-12 items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      onChange={handleToggleAll}
                      disabled={!isDraft || isProcessing}
                    />
                  </View>
                  <Text className="ml-6 flex-1 text-sm font-black uppercase tracking-wider text-muted">
                    Sản phẩm
                  </Text>
                  <Text className="w-32 text-center text-sm font-black uppercase tracking-wider text-muted">
                    SL mua
                  </Text>
                  <Text className="w-48 text-center text-sm font-black uppercase tracking-wider text-muted">
                    SL trả
                  </Text>
                  <Text className="w-40 text-right text-sm font-black uppercase tracking-wider text-muted">
                    Tạm tính
                  </Text>
                </View>

                <FlashList<ItemSnapshot>
                  data={order.itemsSnapshot || []}
                  keyExtractor={(item, index) => item.productId || index.toString()}
                  renderItem={({ item }) => {
                    const qty = getLineQty(item.productId)
                    const isSelected = qty > 0
                    const lineRefundAmount =
                      item.quantity > 0 ? (item.subtotal / item.quantity) * qty : 0

                    return (
                      <View className="flex-row items-center border-b border-outline-variant px-10 py-6">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleItem(item)}
                          disabled={!isDraft || isProcessing}
                        />

                        <View className="ml-6 flex-1">
                          <Text className="text-2xl font-black text-surface-on">{item.name}</Text>
                          <Text className="mt-1 text-sm font-bold text-muted/60">{item.sku}</Text>
                        </View>

                        <Text className="w-32 text-center text-2xl font-black text-surface-on">
                          x{item.quantity}
                        </Text>

                        <View className="w-48 items-center justify-center">
                          <QuantityStepper
                            value={qty}
                            onChange={(newQty) => handleChangeQty(item, newQty)}
                            disabled={!isDraft || isProcessing}
                            min={0}
                            max={item.quantity}
                            editable={true}
                          />
                        </View>

                        <Text className="w-40 text-right text-xl font-black text-error">
                          {isSelected ? formatCurrency(lineRefundAmount) : '-'}
                        </Text>
                      </View>
                    )
                  }}
                />
              </View>

              <View className="flex-1 justify-between border-l border-outline-variant bg-surface-50 p-10">
                <View>
                  <View className="mb-8 flex-row items-center justify-between">
                    <Text className="text-xl font-black uppercase tracking-widest text-surface-on">
                      Thông tin trả hàng
                    </Text>
                  </View>

                  <View className="gap-6">
                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Tổng số món đã mua</Text>
                      <Text className="text-xl font-black text-surface-on">{itemCount} món</Text>
                    </View>

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Sản phẩm đã chọn</Text>
                      <Text className="text-xl font-black text-primary">{selectedItemCount}</Text>
                    </View>

                    <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-6">
                      <Text className="text-xl font-bold text-muted">Hình thức hoàn</Text>
                      <Text className="text-xl font-black text-primary">Online</Text>
                    </View>

                    <View className="mt-8 flex-row items-center justify-between gap-4 border-t-2 border-outline-variant pt-8">
                      <Text className="text-2xl font-black uppercase tracking-tighter text-surface-on">
                        Tổng tiền hoàn
                      </Text>
                      <Text className="text-6xl font-black text-error" numberOfLines={1}>
                        {formatCurrency(displayRefundAmount)}
                      </Text>
                    </View>
                  </View>

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
                          disabled={!isDraft || isProcessing}
                        />
                      ))}
                    </View>

                    <TextInput
                      multiline
                      numberOfLines={2}
                      placeholder="Nhập lý do nếu có..."
                      value={reason}
                      onChangeText={(text) => send({ type: 'SET_REASON', reason: text })}
                      className="h-28 rounded-2xl border border-outline-variant bg-white px-6 py-4 text-xl font-bold text-surface-on"
                      textAlignVertical="top"
                      placeholderTextColor={COLORS.muted}
                      editable={isDraft && !isProcessing}
                    />
                  </View>
                </View>

                <View className="gap-4">
                  <Button
                    label="Hủy bỏ"
                    variant="outline"
                    className="h-16 rounded-2xl"
                    textClassName="text-xl font-black"
                    onPress={handleClose}
                    disabled={isProcessing}
                  />
                  <Button
                    label={isProcessing ? getStepText() : 'XÁC NHẬN TRẢ HÀNG'}
                    variant="error"
                    className="h-20 rounded-2xl"
                    textClassName="text-2xl font-black"
                    onPress={handleConfirm}
                    loading={isProcessing}
                    disabled={!isDraft && !state.matches('completed')}
                  />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </ModalBase>
      </>
    )
  },
)

RefundConfirmModal.displayName = 'RefundConfirmModal'
