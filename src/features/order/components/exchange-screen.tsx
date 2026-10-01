import { useCashSessionId, useEmployee } from '@/features/app/hooks/use-app-context'
import { PaymentMethodCode } from '@/features/payment/types/payment.constants'
import { UnifiedProduct } from '@/features/pos/hooks/use-product-search'
import { HardwareBarcodeScanner } from '@/shared/components/common'
import {
  Button,
  ControlledInput,
  IconButton,
  managerApprovalSchema,
  type ManagerApprovalFormData,
} from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService, useConnectionStore } from '@/core/hardware'
import { appSettings, toast } from '@/shared/store'
import { IOrder } from '@/shared/types'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useMachine } from '@xstate/react'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  calculateExchangeReplacementSubtotal,
  calculateExchangeReplacementValue,
  calculateExchangeReplacementVat,
  calculateExchangeReturnedValue,
  exchangeOrderMachine,
} from '../machines/exchange-order.machine'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { BusinessChecklistModal, BusinessChecklistModalRef } from './business-checklist-modal'
import { ExchangeReplacementSearchPanel } from './exchange-replacement-search-panel'
import { ExchangeReturnItemsPanel } from './exchange-return-items-panel'
import { ExchangeSummaryFooter } from './exchange-summary-footer'

interface ExchangeScreenProps {
  order: IOrder
  onDone?: () => void
}

/** Màn đổi hàng ngang giá — không thu chênh lệch. */
export const ExchangeScreen = memo(function ExchangeScreen({
  order: initialOrder,
  onDone,
}: ExchangeScreenProps) {
  const router = useRouter()
  const [state, send] = useMachine(exchangeOrderMachine)
  const salePrintRef = useRef(null)
  const printedReceiptKeyRef = useRef<string | null>(null)
  const businessChecklistModalRef = useRef<BusinessChecklistModalRef>(null)
  const startedRef = useRef(false)

  const employee = useEmployee()
  const cashSessionId = useCashSessionId()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)

  const {
    order,
    reason,
    returnedLines,
    replacementLines,
    result,
    focusedReturnProductId,
    managerAuthError,
    managerApprovalMessage,
  } = state.context
  const activeOrder = order ?? initialOrder

  const isProcessing =
    state.matches('lookingUpScan') ||
    state.matches('submittingExchange') ||
    state.matches('processing') ||
    state.matches('fetchingOrderDetails')
  const isCompleted = state.matches('completed')
  const isWaitingManager = state.matches('waitingManagerApproval')
  const isDraft = state.matches('draft')

  const {
    control: managerControl,
    handleSubmit: handleManagerSubmit,
    reset: resetManagerForm,
    setError: setManagerError,
  } = useForm<ManagerApprovalFormData>({
    resolver: valibotResolver(managerApprovalSchema),
    defaultValues: { employeeCode: '', pin: '' },
  })

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    send({
      type: 'START',
      order: initialOrder,
      shiftId: cashSessionId ?? '',
      staffId: employee?.id ?? '',
    })
  }, [initialOrder, send, cashSessionId, employee?.id])

  useEffect(() => {
    if (managerAuthError) {
      setManagerError('pin', { type: 'manual', message: managerAuthError })
    }
  }, [managerAuthError, setManagerError])

  useEffect(() => {
    if (result) {
      console.log('>>> EXCHANGE API RESPONSE RESULT:', JSON.stringify(result, null, 2))
    }
  }, [result])

  const returnedValue = useMemo(
    () => calculateExchangeReturnedValue(activeOrder, returnedLines),
    [activeOrder, returnedLines],
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
    !!activeOrder?.voucherCode ||
    (activeOrder?.voucherDiscount != null && activeOrder.voucherDiscount > 0) ||
    (activeOrder?.discount != null && activeOrder.discount > 0)

  const canSubmit =
    isDraft &&
    selectedReturnCount > 0 &&
    replacementLines.length > 0 &&
    differenceAmount === 0 &&
    !isOriginalOrderVoucherApplied

  const selectedReturnItems = useMemo(() => {
    const items = activeOrder?.itemsSnapshot || []
    return returnedLines
      .filter((l) => l.qty > 0)
      .map((l) => items.find((i) => i.productId === l.productId))
      .filter((i): i is ItemSnapshot => !!i)
  }, [activeOrder, returnedLines])

  const seedSkus = useMemo(
    () => selectedReturnItems.map((i) => i.sku?.trim()).filter((s): s is string => !!s),
    [selectedReturnItems],
  )

  const focusedItem = useMemo(() => {
    if (focusedReturnProductId) {
      return (
        selectedReturnItems.find((i) => i.productId === focusedReturnProductId) ??
        selectedReturnItems[0] ??
        null
      )
    }
    return selectedReturnItems[0] ?? null
  }, [focusedReturnProductId, selectedReturnItems])

  const suggestedUnitPrice =
    focusedItem && focusedItem.quantity > 0
      ? focusedItem.subtotal / focusedItem.quantity
      : focusedItem?.price

  const getReturnLineQty = useCallback(
    (productId: string) => returnedLines.find((line) => line.productId === productId)?.qty ?? 0,
    [returnedLines],
  )

  const getReturnLineAmount = useCallback((item: ItemSnapshot, qty: number) => {
    if (qty <= 0 || item.quantity <= 0) return 0
    return (item.subtotal / item.quantity) * qty
  }, [])

  const saleOrder = useMemo((): IOrder | null => {
    if (!result || !activeOrder) return null

    // 1. Tính toán các item còn lại từ đơn hàng gốc sau khi trừ số lượng đổi trả
    const originalItems = activeOrder.itemsSnapshot || []
    const remainingOldItems: ItemSnapshot[] = []

    for (const origItem of originalItems) {
      const returnLine = returnedLines.find((l) => l.productId === origItem.productId)
      const returnQty = returnLine ? returnLine.qty : 0
      const remainingQty = origItem.quantity - returnQty

      // Nếu còn lại số lượng > 0, giữ lại item đó trong hóa đơn mới với số lượng đã trừ
      if (remainingQty > 0) {
        const discountPerUnit =
          origItem.quantity > 0 ? (origItem.discountAmount || 0) / origItem.quantity : 0
        const proportionalDiscount = discountPerUnit * remainingQty
        const proportionalSubtotal = origItem.price * remainingQty - proportionalDiscount
        const proportionalTax =
          origItem.quantity > 0 ? ((origItem.taxAmount || 0) / origItem.quantity) * remainingQty : 0

        remainingOldItems.push({
          ...origItem,
          quantity: remainingQty,
          subtotal: proportionalSubtotal,
          taxAmount: proportionalTax,
          discountAmount: proportionalDiscount,
          remainingQty: undefined,
          isExchange: false,
        })
      }
      // Nếu remainingQty <= 0: Đã đổi hết item này -> Không đưa vào hóa đơn mới nữa
    }

    // 2. Lấy danh sách sản phẩm mới thay thế
    const replacementItems: ItemSnapshot[] = replacementLines
      .filter((line) => line.qty > 0)
      .map((line) => {
        const netPrice = line.price * line.qty
        const taxRate = line.taxRate ?? 0
        const taxAmount = taxRate > 0 ? Math.round(netPrice * (taxRate / (100 + taxRate))) : 0
        return {
          productId: line.productId || line.variantId,
          sku: line.sku,
          name: line.name,
          price: line.price,
          quantity: line.qty,
          subtotal: line.price * line.qty,
          taxRate,
          taxAmount,
          discountAmount: 0,
          isExchange: true,
        }
      })

    // 3. Toàn bộ danh sách sản phẩm của đơn hàng mới: sản phẩm giữ lại + sản phẩm mới đổi
    const itemsSnapshot: ItemSnapshot[] = [...remainingOldItems, ...replacementItems]

    return {
      ...activeOrder,
      itemsSnapshot,
    }
  }, [activeOrder, replacementLines, result, returnedLines])

  const leave = useCallback(() => {
    if (isProcessing) return
    send({ type: 'RESET' })
    if (onDone) onDone()
    else if (router.canGoBack()) router.back()
    else router.replace('/(tab)/orders')
  }, [isProcessing, onDone, router, send])

  useEffect(() => {
    if (!isCompleted) return
    const receiptKey =
      result?.newOrder?.orderId || result?.return?.returnId || result?.originalOrderId || 'exchange'
    if (printedReceiptKeyRef.current === receiptKey) return

    let cancelled = false
    const finish = async () => {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)))
      if (cancelled) return
      try {
        if (saleOrder && salePrintRef.current) {
          await PrinterService.printComponent(salePrintRef, { doubleCopy: true })
        }
        printedReceiptKeyRef.current = receiptKey
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi in hóa đơn đổi hàng')
      } finally {
        if (cancelled) return
        if (onDone) onDone()
        else if (router.canGoBack()) router.back()
        else router.replace('/(tab)/orders')
        setTimeout(() => send({ type: 'RESET' }), 0)
      }
    }
    finish()
    return () => {
      cancelled = true
    }
  }, [isCompleted, saleOrder, result, onDone, router, send])

  const handleConfirmEqual = useCallback(() => {
    if (!canSubmit || isProcessing) return
    if (!isNetworkConnected) {
      toast.error('Đổi hàng chỉ hỗ trợ khi có kết nối mạng.')
      return
    }

    const run = () => send({ type: 'SUBMIT' })

    if (appSettings.get('exchangeRequireChecklist')) {
      businessChecklistModalRef.current?.open({
        title: 'Checklist xác nhận',
        subtitle: 'Xác nhận trước khi hoàn tất đổi ngang giá.',
        items: [
          'Tôi đã nhận lại sản phẩm lỗi/cũ từ khách hàng.',
          'Tôi đã giao đầy đủ sản phẩm mới thay thế cho khách hàng.',
          'Sản phẩm đổi mới có cùng giá trị với sản phẩm trả lại (Đổi ngang).',
        ],
        onDontShowAgain: () => appSettings.set('exchangeRequireChecklist', false),
        onConfirm: run,
      })
      return
    }

    toast.confirm({
      title: 'Xác nhận đổi hàng',
      message: `Đổi ngang ${selectedReturnCount} món · giá trị ${formatCurrency(returnedValue)}?`,
      onConfirm: run,
    })
  }, [canSubmit, isProcessing, isNetworkConnected, selectedReturnCount, returnedValue, send])

  const stepText = useMemo(() => {
    if (state.matches('fetchingOrderDetails')) return 'Đang tải chi tiết đơn...'
    if (state.matches('lookingUpScan')) return 'Đang quét mã...'
    if (state.matches('submittingExchange')) return 'Đang xử lý đổi hàng...'
    if (state.matches('processing')) return 'Đang hoàn tất...'
    if (state.matches('waitingManagerApproval')) return 'Chờ duyệt quản lý...'
    if (state.matches('completed')) return 'Đổi hàng hoàn tất'
    return 'Đổi ngang giá · chọn hàng trả và hàng mới'
  }, [state])

  if (!activeOrder) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-lg text-surface-on-variant">Không tìm thấy đơn hàng</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {saleOrder && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={salePrintRef}>
            <BitexcoReceiptTemplate order={saleOrder} staffName={employee?.displayName} />
          </View>
        </View>
      )}

      {!isWaitingManager && (
        <HardwareBarcodeScanner onScan={(codes) => send({ type: 'SCAN_CODES', codes })} />
      )}

      <View className="flex-row items-center justify-between border-b border-surface-200 bg-white px-7 py-[18px]">
        <View>
          <Text className="text-[34px] font-extrabold text-surface-on">Đổi hàng</Text>
          <Text className="mt-1 text-[19px] font-bold text-surface-on-variant">
            {activeOrder.code || activeOrder.id} · {stepText}
          </Text>
        </View>
        <IconButton
          icon={X}
          size={33}
          color={COLORS.surface.onVariant}
          onPress={leave}
          disabled={isProcessing}
        />
      </View>

      <View className="min-h-0 flex-1 flex-row px-3.5 pb-3.5 pt-2.5">
        <View
          className="min-h-0 flex-1 overflow-hidden rounded-[15px] bg-white"
          style={{
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <ExchangeReturnItemsPanel
            items={activeOrder.itemsSnapshot || []}
            isDraft={isDraft}
            isProcessing={isProcessing}
            getLineQty={getReturnLineQty}
            getLineAmount={getReturnLineAmount}
            onToggleItem={(item) => {
              const currentQty = getReturnLineQty(item.productId)
              if (currentQty > 0) {
                send({ type: 'CLEAR_RETURN_LINE', productId: item.productId })
                return
              }
              send({ type: 'SET_RETURN_LINE_QTY', productId: item.productId, qty: 1 })
            }}
            onChangeQty={(item, qty) =>
              send({ type: 'SET_RETURN_LINE_QTY', productId: item.productId, qty })
            }
            onSelectAll={() => send({ type: 'SET_ALL_RETURN_LINES' })}
            onClearAll={() => {
              activeOrder.itemsSnapshot?.forEach((item) => {
                send({ type: 'CLEAR_RETURN_LINE', productId: item.productId })
              })
            }}
          />
        </View>

        <View
          className="ml-2.5 min-h-0 flex-1 overflow-hidden rounded-[15px] bg-white"
          style={{
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <ExchangeReplacementSearchPanel
            isDraft={isDraft}
            isProcessing={isProcessing}
            seedSkus={seedSkus}
            suggestedUnitPrice={suggestedUnitPrice}
            selectedLines={replacementLines}
            onSelectProduct={(product: UnifiedProduct) =>
              send({ type: 'ADD_REPLACEMENT_ITEM', product })
            }
            onChangeQty={(variantId, qty) =>
              send({ type: 'UPDATE_REPLACEMENT_QTY', variantId, qty })
            }
            onRemoveItem={(variantId) => send({ type: 'REMOVE_REPLACEMENT_ITEM', variantId })}
          />
          <ExchangeSummaryFooter
            returnedValue={returnedValue}
            replacementSubtotal={replacementSubtotal}
            replacementVat={replacementVat}
            differenceAmount={differenceAmount}
            selectedReturnCount={selectedReturnCount}
            replacementCount={replacementLines.length}
            isOriginalOrderVoucherApplied={isOriginalOrderVoucherApplied}
            canSubmit={canSubmit}
            isProcessing={isProcessing}
            onClose={leave}
            onConfirmEqual={handleConfirmEqual}
          />
        </View>
      </View>

      <BusinessChecklistModal ref={businessChecklistModalRef} />

      {(isWaitingManager ||
        (state.matches('submittingExchange') && state.context.managerAuth !== null)) && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/55 p-[29px]">
          <View className="w-full max-w-[550px] rounded-3xl bg-white p-[29px]" style={{ gap: 17 }}>
            <Text className="text-[27px] font-bold text-surface-on">Cần duyệt quản lý</Text>
            <Text className="text-[18px] font-medium leading-7 text-surface-on-variant">
              {managerApprovalMessage || 'Nhập tài khoản và PIN quản lý để phê duyệt đổi hàng.'}
            </Text>
            <View style={{ gap: 15 }}>
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
            <View className="mt-2 flex-row gap-4">
              <Button
                label="Huỷ"
                variant="outline"
                className="h-[68px] flex-1 rounded-xl"
                textClassName="text-[19px] font-bold"
                disabled={state.matches('submittingExchange')}
                onPress={() => {
                  resetManagerForm()
                  send({ type: 'CANCEL' })
                }}
              />
              <Button
                label="Xác nhận"
                variant="primary"
                className="h-[68px] flex-1 rounded-xl"
                textClassName="text-[19px] font-bold"
                loading={state.matches('submittingExchange')}
                onPress={handleManagerSubmit((data) => {
                  send({
                    type: 'SUBMIT_MANAGER_PIN',
                    managerAuth: { employeeCode: data.employeeCode, pin: data.pin },
                  })
                })}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
})
