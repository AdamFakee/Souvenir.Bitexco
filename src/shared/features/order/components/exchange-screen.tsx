import { HardwareBarcodeScanner } from '@/shared/components/common'
import { Button, ControlledInput, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useCashSessionId, useEmployee } from '@/shared/features/app/hooks/use-app-context'
import { useAppStore } from '@/shared/features/app/store/use-app-store'
import { PaymentMethodCode } from '@/shared/features/payment/types/payment.constants'
import { UnifiedProduct } from '@/shared/features/pos/hooks/use-product-search'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService } from '@/shared/services'
import { appSettings, toast, useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useMachine } from '@xstate/react'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as v from 'valibot'
import {
  calculateExchangeReplacementSubtotal,
  calculateExchangeReplacementValue,
  calculateExchangeReplacementVat,
  calculateExchangeReturnedValue,
  exchangeOrderMachine,
} from '../machines/exchange-order.machine'
import { IOrder, RefundReceiptData } from '../types'
import { BitexcoReceiptTemplate } from './bitexco-receipt-template'
import { BusinessChecklistModal, BusinessChecklistModalRef } from './business-checklist-modal'
import { ExchangeReplacementSearchPanel } from './exchange-replacement-search-panel'
import { ExchangeReturnItemsPanel } from './exchange-return-items-panel'
import { ExchangeSummaryFooter } from './exchange-summary-footer'
import { RefundReceiptTemplate } from './refund-receipt-template'

const managerSchema = v.object({
  employeeCode: v.pipe(v.string(), v.minLength(1, 'Mã quản lý là bắt buộc')),
  pin: v.pipe(v.string(), v.minLength(1, 'PIN là bắt buộc')),
})
type ManagerForm = v.InferOutput<typeof managerSchema>

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
  const refundPrintRef = useRef(null)
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
  } = useForm<ManagerForm>({
    resolver: valibotResolver(managerSchema),
    defaultValues: { employeeCode: '', pin: '' },
  })

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const appContext = useAppStore.getState().appService?.getSnapshot().context
    send({
      type: 'START',
      order: initialOrder,
      shiftId: appContext?.cashSessionId || cashSessionId || '',
      staffId: appContext?.employee?.id || employee?.id || '',
    })
  }, [initialOrder, send, cashSessionId, employee?.id])

  useEffect(() => {
    if (managerAuthError) {
      setManagerError('pin', { type: 'manual', message: managerAuthError })
    }
  }, [managerAuthError, setManagerError])

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

  const refundReceipt = useMemo((): RefundReceiptData | null => {
    if (!result) return null
    if (result.return?.receipt) {
      return result.return.receipt
    }
    if (!activeOrder) return null
    const lines = returnedLines
      .filter((line) => line.qty > 0)
      .map((line) => {
        const item = activeOrder.itemsSnapshot?.find((o) => o.productId === line.productId)
        const unitPrice = item && item.quantity > 0 ? item.subtotal / item.quantity : 0
        return {
          productId: line.productId,
          sku: item?.sku,
          name: item?.name || line.productId,
          orderedQty: item?.quantity ?? line.qty,
          returnedQty: line.qty,
          remainingQty: Math.max(0, (item?.quantity ?? line.qty) - line.qty),
          unitPrice,
          lineRefundAmount: unitPrice * line.qty,
          isReturned: true,
        }
      })
    if (lines.length === 0) return null
    return {
      orderId: result.originalOrderId || activeOrder.id,
      orderCode: result.originalOrderCode || activeOrder.code || undefined,
      returnId: result.return?.returnId,
      returnCode: result.return?.returnCode,
      reason: reason || 'Đổi hàng',
      refundedAt: new Date().toISOString(),
      refundAmount: result.refundValue ?? returnedValue,
      lines,
    }
  }, [activeOrder, reason, result, returnedLines, returnedValue])

  const saleOrder = useMemo((): IOrder | null => {
    if (!result) return null

    // Nếu backend trả về receipt cho đơn bán mới, map trực tiếp từ receipt
    if (result.receipt) {
      const receipt = result.receipt
      const itemsSnapshot = (receipt.lines || []).map((line) => ({
        productId: line.productId || line.variantId || '',
        sku: line.sku || '',
        name: line.name || '',
        price: line.unitPrice || 0,
        quantity: line.qty || 0,
        subtotal: (line.unitPrice || 0) * (line.qty || 0),
        taxRate: line.taxRate ?? 0,
        taxAmount: line.taxAmount ?? 0,
        discountAmount: line.discountAmount ?? 0,
      }))

      const paymentsSnapshot = (receipt.payments || []).map((p) => ({
        method: (p.method?.toLowerCase() || 'cash') as PaymentMethodCode,
        amount: p.amount || 0,
      }))

      return {
        id: receipt.orderId,
        code: receipt.orderCode,
        shiftId: cashSessionId || '',
        staffId: employee?.id || '',
        status: 'COMPLETED',
        subtotal: receipt.subTotal || 0,
        discount: receipt.discountTotal ?? 0,
        voucherDiscount: receipt.voucherDiscount ?? 0,
        total: receipt.grandTotal || 0,
        totalTax: receipt.taxTotal || 0,
        customerTaxInfo: null,
        isDeleted: false,
        canReturn: true,
        createdAt: receipt.issuedAt ? new Date(receipt.issuedAt) : new Date(),
        updatedAt: receipt.issuedAt ? new Date(receipt.issuedAt) : new Date(),
        itemsSnapshot,
        paymentsSnapshot,
      }
    }

    if (!result.newOrder) return null
    const newOrder = result.newOrder
    const itemsSnapshot = replacementLines
      .filter((line) => line.qty > 0)
      .map((line) => {
        const taxAmount = calculateExchangeReplacementVat([line])
        return {
          productId: line.productId || line.variantId,
          sku: line.sku,
          name: line.name,
          price: line.price,
          quantity: line.qty,
          subtotal: line.price * line.qty,
          taxRate: line.taxRate ?? 0,
          taxAmount,
          discountAmount: 0,
        }
      })

    return {
      id: newOrder.orderId,
      code: newOrder.orderCode,
      shiftId: cashSessionId || '',
      staffId: employee?.id || '',
      status: 'COMPLETED',
      subtotal: newOrder.subTotal ?? replacementSubtotal,
      discount: newOrder.discountTotal ?? 0,
      voucherDiscount: newOrder.voucherDiscount ?? 0,
      total: newOrder.grandTotal ?? replacementValue,
      totalTax: newOrder.taxTotal ?? replacementVat,
      customerTaxInfo: null,
      isDeleted: false,
      canReturn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      itemsSnapshot,
      paymentsSnapshot: [],
    }
  }, [
    cashSessionId,
    employee?.id,
    replacementLines,
    replacementSubtotal,
    replacementValue,
    replacementVat,
    result,
  ])

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
        if (refundReceipt && refundPrintRef.current) {
          await PrinterService.printComponent(refundPrintRef, { doubleCopy: true })
        }
        if (cancelled) return
        if (saleOrder && salePrintRef.current) {
          await PrinterService.printComponent(salePrintRef, { doubleCopy: true })
        }
        printedReceiptKeyRef.current = receiptKey
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi in phiếu đổi hàng')
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
  }, [isCompleted, refundReceipt, saleOrder, result, onDone, router, send])

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
      {refundReceipt && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={refundPrintRef}>
            <RefundReceiptTemplate receipt={refundReceipt} />
          </View>
        </View>
      )}
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
