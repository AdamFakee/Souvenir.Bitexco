import { HardwareBarcodeScanner } from '@/shared/components/common'
import { IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppStore } from '@/shared/features/app'
import { UnifiedProduct } from '@/shared/features/pos/hooks/use-product-search'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService } from '@/shared/services'
import { appSettings, toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { BusinessChecklistModal, BusinessChecklistModalRef } from './business-checklist-modal'
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
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ExchangeReceiptData } from '../api/remote/order.remote.api'
import {
  calculateExchangeReplacementSubtotal,
  calculateExchangeReplacementValue,
  calculateExchangeReplacementVat,
  calculateExchangeReturnedValue,
  exchangeOrderMachine,
} from '../machines/exchange-order.machine'
import { IOrder } from '../types'
import { ExchangeBillTemplate } from './exchange-bill-template'
import { ExchangeReplacementItemsList } from './exchange-replacement-items-list'
import { ExchangeReplacementSearchPanel } from './exchange-replacement-search-panel'
import { ExchangeReturnItemsPanel } from './exchange-return-items-panel'
import { ExchangeSummaryFooter } from './exchange-summary-footer'

export interface ExchangeConfirmModalRef {
  open: (order: IOrder) => void
  close: () => void
}

interface ExchangeConfirmModalProps {
  onSuccess?: () => void
}

export const ExchangeConfirmModal = React.forwardRef<
  ExchangeConfirmModalRef,
  ExchangeConfirmModalProps
>(({ onSuccess }, ref) => {
  const [state, send] = useMachine(exchangeOrderMachine)
  const [visible, setVisible] = useState(false)
  const receiptPrintRef = useRef(null)
  const printedReceiptKeyRef = useRef<string | null>(null)
  const businessChecklistModalRef = useRef<BusinessChecklistModalRef>(null)

  const { order, reason, returnedLines, replacementLines, result } = state.context
  const isProcessing =
    state.matches('lookingUpScan') ||
    state.matches('submittingExchange') ||
    state.matches('receivingReturnedItems') ||
    state.matches('issuingReplacementItems')
  const isDraft = state.matches('draft')
  const isCompleted = state.matches('completed')

  const returnedValue = useMemo(
    () => calculateExchangeReturnedValue(order, returnedLines),
    [order, returnedLines],
  )
  const replacementSubtotal = useMemo(
    () => calculateExchangeReplacementSubtotal(replacementLines),
    [replacementLines],
  )
  const replacementVat = useMemo(
    () => calculateExchangeReplacementVat(replacementLines),
    [replacementLines],
  )
  const replacementValue = useMemo(
    () => calculateExchangeReplacementValue(replacementLines),
    [replacementLines],
  )
  const differenceAmount = replacementValue - returnedValue
  const selectedReturnCount = returnedLines.filter((line) => line.qty > 0).length
  const isOriginalOrderVoucherApplied =
    !!order?.voucherCode || !!order?.voucherDiscount || !!order?.discount
  const canSubmit =
    isDraft &&
    selectedReturnCount > 0 &&
    replacementLines.length > 0 &&
    replacementValue >= returnedValue &&
    !isOriginalOrderVoucherApplied

  const getReturnLineQty = useCallback(
    (productId: string) => {
      return returnedLines.find((line) => line.productId === productId)?.qty ?? 0
    },
    [returnedLines],
  )

  const getReturnLineAmount = useCallback((item: ItemSnapshot, qty: number) => {
    if (qty <= 0 || item.quantity <= 0) return 0
    return (item.subtotal / item.quantity) * qty
  }, [])

  const buildFallbackReceipt = useCallback((): ExchangeReceiptData | null => {
    if (!order) return null

    return {
      exchangeId: result?.exchangeId,
      exchangeCode: result?.exchangeCode,
      orderId: order.id,
      orderCode: result?.orderCode,
      exchangedAt: new Date().toISOString(),
      reason,
      returnedValue: result?.returnedValue ?? returnedValue,
      replacementValue: result?.replacementValue ?? replacementValue,
      differenceAmount: result?.differenceAmount ?? Math.max(0, differenceAmount),
      returnedLines: returnedLines
        .filter((line) => line.qty > 0)
        .map((line) => {
          const item = order.itemsSnapshot?.find(
            (orderItem) => orderItem.productId === line.productId,
          )
          const unitPrice = item && item.quantity > 0 ? item.subtotal / item.quantity : 0
          return {
            productId: line.productId,
            sku: item?.sku,
            name: item?.name || line.productId,
            qty: line.qty,
            unitPrice,
            lineAmount: unitPrice * line.qty,
          }
        }),
      replacementLines: replacementLines
        .filter((line) => line.qty > 0)
        .map((line) => {
          const lineVat = calculateExchangeReplacementVat([line])
          return {
            productId: line.productId,
            sku: line.sku,
            name: line.name,
            qty: line.qty,
            unitPrice: line.price,
            lineAmount: line.price * line.qty + lineVat,
          }
        }),
    }
  }, [
    differenceAmount,
    order,
    reason,
    replacementLines,
    replacementValue,
    result,
    returnedLines,
    returnedValue,
  ])

  const receipt = result?.receipt || buildFallbackReceipt()

  useImperativeHandle(ref, () => ({
    open: (o: IOrder) => {
      const appContext = useAppStore.getState().appService?.getSnapshot().context
      const shiftId = appContext?.cashSessionId || ''
      const staffId = appContext?.employee?.id || ''

      printedReceiptKeyRef.current = null
      send({ type: 'RESET' })
      send({ type: 'START', order: o, shiftId, staffId })
      businessChecklistModalRef.current?.close()
      setVisible(true)
    },
    close: () => {
      if (isProcessing) return
      handleClose()
    },
  }))

  useEffect(() => {
    if (!isCompleted) return

    const receiptKey =
      receipt?.exchangeId || receipt?.exchangeCode || result?.exchangeId || order?.id || 'exchange'
    const closeAfterSuccess = async () => {
      try {
        if (receipt && receiptPrintRef.current && printedReceiptKeyRef.current !== receiptKey) {
          printedReceiptKeyRef.current = receiptKey
          await PrinterService.printComponent(receiptPrintRef)
        }
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi in phiếu đổi hàng')
      } finally {
        setVisible(false)
        onSuccess?.()
        setTimeout(() => send({ type: 'RESET' }), 300)
      }
    }

    closeAfterSuccess()
  }, [isCompleted, receipt, result, order, onSuccess, send])

  const handleClose = useCallback(() => {
    if (isProcessing) return
    setVisible(false)
    send({ type: 'RESET' })
  }, [isProcessing, send])

  const handleSelectReplacement = useCallback(
    (product: UnifiedProduct) => {
      send({ type: 'ADD_REPLACEMENT_ITEM', product })
    },
    [send],
  )

  const handleToggleReturnItem = useCallback(
    (item: ItemSnapshot) => {
      const currentQty = getReturnLineQty(item.productId)
      if (currentQty > 0) {
        send({ type: 'CLEAR_RETURN_LINE', productId: item.productId })
        return
      }

      send({ type: 'SET_RETURN_LINE_QTY', productId: item.productId, qty: 1 })
    },
    [getReturnLineQty, send],
  )

  const handleConfirm = () => {
    if (!order) return

    const exchangeRequireChecklist = appSettings.get('exchangeRequireChecklist')
    if (exchangeRequireChecklist) {
      businessChecklistModalRef.current?.open({
        title: 'Checklist Xác nhận Nghiệp vụ',
        subtitle: 'Vui lòng xác nhận các bước nghiệp vụ trước khi hoàn tất đổi hàng.',
        items: [
          'Tôi đã nhận lại sản phẩm lỗi/cũ từ khách hàng.',
          'Tôi đã giao đầy đủ sản phẩm mới thay thế cho khách hàng.',
          `Tôi đã thu/chi đúng số tiền chênh lệch (${formatCurrency(Math.max(0, differenceAmount))}) từ khách hàng.`,
        ],
        onDontShowAgain: () => appSettings.set('exchangeRequireChecklist', false),
        onConfirm: () => {
          send({ type: 'SUBMIT' })
        },
      })
    } else {
      toast.confirm({
        title: 'Xác nhận đổi hàng',
        message: `Bạn có chắc chắn muốn đổi ${selectedReturnCount} sản phẩm, hàng mới ${formatCurrency(
          replacementValue,
        )}, chênh lệch ${formatCurrency(Math.max(0, differenceAmount))} không?`,
        onConfirm: () => send({ type: 'SUBMIT' }),
      })
    }
  }

  const stepText = useMemo(() => {
    if (state.matches('lookingUpScan')) return 'Đang quét mã sản phẩm đổi mới...'
    if (state.matches('submittingExchange')) return 'Đang xử lý đổi hàng...'
    if (state.matches('receivingReturnedItems')) return 'Đang nhập kho hàng trả...'
    if (state.matches('issuingReplacementItems')) return 'Đang xuất kho hàng đổi mới...'
    if (state.matches('completed')) return 'Đổi hàng hoàn tất'
    return 'Chọn hàng trả và hàng đổi mới'
  }, [state])

  const handleChangeReturnQty = useCallback(
    (item: ItemSnapshot, qty: number) => {
      send({ type: 'SET_RETURN_LINE_QTY', productId: item.productId, qty })
    },
    [send],
  )

  const handleSelectAllReturnLines = useCallback(() => {
    send({ type: 'SET_ALL_RETURN_LINES' })
  }, [send])

  const handleClearAllReturnLines = useCallback(() => {
    order?.itemsSnapshot?.forEach((item) => {
      send({ type: 'CLEAR_RETURN_LINE', productId: item.productId })
    })
  }, [order, send])

  const handleChangeReplacementQty = useCallback(
    (variantId: string, qty: number) => {
      send({ type: 'UPDATE_REPLACEMENT_QTY', variantId, qty })
    },
    [send],
  )

  const handleRemoveReplacementItem = useCallback(
    (variantId: string) => {
      send({ type: 'REMOVE_REPLACEMENT_ITEM', variantId })
    },
    [send],
  )

  if (!order) return null

  return (
    <>
      {receipt && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={receiptPrintRef}>
            <ExchangeBillTemplate receipt={receipt} />
          </View>
        </View>
      )}

      <ModalBase visible={visible} onClose={handleClose} dismissible={!isProcessing} size="90%">
        <SafeAreaView className="flex-1">
          {visible && (
            <HardwareBarcodeScanner onScan={(codes) => send({ type: 'SCAN_CODES', codes })} />
          )}

          <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
            <View>
              <Text className="text-3xl font-black tracking-tight text-surface-on">Đổi hàng</Text>
              <Text className="mt-1 text-base font-bold text-muted">{stepText}</Text>
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
            <ExchangeReturnItemsPanel
              items={order.itemsSnapshot || []}
              isDraft={isDraft}
              isProcessing={isProcessing}
              getLineQty={getReturnLineQty}
              getLineAmount={getReturnLineAmount}
              onToggleItem={handleToggleReturnItem}
              onChangeQty={handleChangeReturnQty}
              onSelectAll={handleSelectAllReturnLines}
              onClearAll={handleClearAllReturnLines}
            />

            <View className="flex-1 border-l border-outline-variant bg-surface-50">
              <ExchangeReplacementSearchPanel
                isDraft={isDraft}
                isProcessing={isProcessing}
                onSelectProduct={handleSelectReplacement}
              />

              <ExchangeReplacementItemsList
                lines={replacementLines}
                isDraft={isDraft}
                isProcessing={isProcessing}
                onChangeQty={handleChangeReplacementQty}
                onRemoveItem={handleRemoveReplacementItem}
              />

              <ExchangeSummaryFooter
                returnedValue={returnedValue}
                replacementSubtotal={replacementSubtotal}
                replacementVat={replacementVat}
                differenceAmount={differenceAmount}
                isOriginalOrderVoucherApplied={isOriginalOrderVoucherApplied}
                canSubmit={canSubmit}
                isProcessing={isProcessing}
                processingText={stepText}
                onClose={handleClose}
                onConfirm={handleConfirm}
              />
            </View>
          </View>
        </SafeAreaView>
        <BusinessChecklistModal ref={businessChecklistModalRef} />
      </ModalBase>
    </>
  )
})

ExchangeConfirmModal.displayName = 'ExchangeConfirmModal'
