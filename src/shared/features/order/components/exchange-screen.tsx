import { HardwareBarcodeScanner } from '@/shared/components/common'
import { IconButton } from '@/shared/components/ui'
import { useAppContext } from '@/shared/features/app/hooks/use-app-context'
import { useAppStore } from '@/shared/features/app/store/use-app-store'
import {
  CashPaymentPopup,
  ExchangePortablePaymentPopup,
  ExchangePortablePaymentPopupRef,
  ExchangeQrPaymentPopup,
  ExchangeQrPaymentPopupRef,
  PAYMENT_REGISTRY,
  PaymentResult,
} from '@/shared/features/payment'
import type { CartItem } from '@/shared/features/pos'
import { UnifiedProduct } from '@/shared/features/pos/hooks/use-product-search'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { PrinterService } from '@/shared/services'
import { appSettings, toast, useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { useMachine } from '@xstate/react'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ExchangeReceiptData } from '../api/remote/order.remote.api'
import {
  calculateExchangeReplacementSubtotal,
  calculateExchangeReplacementValue,
  calculateExchangeReplacementVat,
  calculateExchangeReturnedValue,
  ExchangeSelectedPayment,
  ExchangePaymentMethod,
  exchangeOrderMachine,
} from '../machines/exchange-order.machine'
import { IOrder } from '../types'
import { BusinessChecklistModal, BusinessChecklistModalRef } from './business-checklist-modal'
import { ExchangeBillTemplate } from './exchange-bill-template'
import { ExchangeReplacementItemsList } from './exchange-replacement-items-list'
import { ExchangeReplacementSearchPanel } from './exchange-replacement-search-panel'
import { ExchangeReturnItemsPanel } from './exchange-return-items-panel'
import { ExchangeSummaryFooter } from './exchange-summary-footer'

const EXCHANGE_PAYMENT_TYPES = new Set(['cash', 'qr_bidv', 'card_bidv'])

interface ExchangeScreenProps {
  order: IOrder
  onDone?: () => void
}

/**
 * Màn đổi hàng full-screen (giống layout POS).
 * Thanh toán: reuse popup POS gốc Cash / QR / Card — không sửa machine.
 */
export const ExchangeScreen = memo(function ExchangeScreen({
  order: initialOrder,
  onDone,
}: ExchangeScreenProps) {
  const router = useRouter()
  const [state, send] = useMachine(exchangeOrderMachine)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const receiptPrintRef = useRef(null)
  const printedReceiptKeyRef = useRef<string | null>(null)
  const businessChecklistModalRef = useRef<BusinessChecklistModalRef>(null)
  const popupRefs = useRef<
    Record<string, ExchangeQrPaymentPopupRef | ExchangePortablePaymentPopupRef | null>
  >({})
  const startedRef = useRef(false)

  const { employee, cashSessionId, paymentMethods } = useAppContext()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const isPosConnected = useConnectionStore((s) => s.isPosConnected)

  const { order, reason, returnedLines, replacementLines, result } = state.context
  const activeOrder = order ?? initialOrder

  const isProcessing =
    state.matches('lookingUpScan') ||
    state.matches('submittingExchange') ||
    state.matches('receivingReturnedItems') ||
    state.matches('issuingReplacementItems')
  const isCompleted = state.matches('completed')

  // Boot machine once
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
  const collectAmount = Math.max(0, differenceAmount)
  const selectedReturnCount = returnedLines.filter((line) => line.qty > 0).length
  const isOriginalOrderVoucherApplied =
    !!activeOrder?.voucherCode || !!activeOrder?.voucherDiscount || !!activeOrder?.discount
  const canSubmit =
    state.matches('draft') &&
    selectedReturnCount > 0 &&
    replacementLines.length > 0 &&
    replacementValue >= returnedValue &&
    !isOriginalOrderVoucherApplied

  /**
   * Settlement line cho popup POS (cash/QR/card).
   * Server validate unitPrice ≈ catalog (≤5%). grandTotal = (price−discount)×(1+tax).
   * payment.amount phải == grandTotal, không thì order kẹt UNPAID / "chưa thanh toán".
   */
  const settlementCheckout = useMemo(() => {
    if (collectAmount <= 0) {
      return { items: [] as CartItem[], payTotal: 0 }
    }
    const candidates = replacementLines.filter((l) => l.qty > 0)
    const source =
      candidates.find((l) => l.price >= collectAmount) || candidates[0] || replacementLines[0]
    if (!source) return { items: [] as CartItem[], payTotal: collectAmount }

    const catalogPrice = Math.max(0, Math.round(Number(source.price) || 0))
    const rawTax = Number(source.taxRate) || 0
    // 8|10 = percent; 0.08|0.1 = decimal
    const taxFactor = rawTax > 1 ? rawTax / 100 : rawTax
    const taxRateForApi = rawTax > 1 ? rawTax : rawTax > 0 ? rawTax * 100 : 0

    // net * (1+tax) ≈ collect → chọn net integer sao cho grand gần collect nhất
    const net = taxFactor > 0 ? Math.round(collectAmount / (1 + taxFactor)) : collectAmount
    const discountAmount = Math.max(0, catalogPrice - net)
    const lineNet = catalogPrice - discountAmount
    const taxAmt = Math.round(lineNet * taxFactor)
    const payTotal = lineNet + taxAmt

    const items: CartItem[] = [
      {
        id: source.variantId,
        product: {
          id: source.variantId,
          name: source.name || 'Chênh lệch đổi hàng',
          price: catalogPrice,
          sku: source.sku || 'EXCHANGE-DIFF',
          unit: source.unitCode || '',
          unitId: source.unitId || '',
          taxRate: taxRateForApi,
          stock: source.stock,
        },
        quantity: 1,
        price: catalogPrice,
        discountAmount,
      },
    ]
    return { items, payTotal: payTotal > 0 ? payTotal : collectAmount }
  }, [collectAmount, replacementLines])

  const paymentItems = settlementCheckout.items
  const paymentTotal = settlementCheckout.payTotal

  const activePaymentMethods = useMemo(() => {
    let list =
      !paymentMethods || paymentMethods.length === 0
        ? PAYMENT_REGISTRY.filter((s) => EXCHANGE_PAYMENT_TYPES.has(String(s.type)))
        : paymentMethods
            .filter((method) => method.enabled)
            .map((method) => {
              const original = PAYMENT_REGISTRY.find((s) => s.type === method.code)
              if (!original || !EXCHANGE_PAYMENT_TYPES.has(String(original.type))) return null
              return {
                ...original,
                label: method.name,
                displayOrder: method.displayOrder || 99,
              }
            })
            .filter((s): s is NonNullable<typeof s> => s !== null)

    if (list.length === 0) {
      const cash = PAYMENT_REGISTRY.find((s) => s.type === 'cash')
      if (cash) list = [cash]
    }

    return list
      .sort((a, b) => ((a as any).displayOrder || 99) - ((b as any).displayOrder || 99))
      .map((method) => ({
        type: String(method.type),
        label: method.label,
        icon: method.icon,
        disabled:
          (method.type === 'qr_bidv' && !isNetworkConnected) ||
          (method.type === 'card_bidv' && !isPosConnected),
      }))
  }, [paymentMethods, isNetworkConnected, isPosConnected])

  const getReturnLineQty = useCallback(
    (productId: string) => returnedLines.find((line) => line.productId === productId)?.qty ?? 0,
    [returnedLines],
  )

  const getReturnLineAmount = useCallback((item: ItemSnapshot, qty: number) => {
    if (qty <= 0 || item.quantity <= 0) return 0
    return (item.subtotal / item.quantity) * qty
  }, [])

  const buildFallbackReceipt = useCallback((): ExchangeReceiptData | null => {
    if (!activeOrder) return null
    return {
      exchangeId: result?.newOrder?.orderId || result?.originalOrderId || undefined,
      exchangeCode: result?.newOrder?.orderCode || result?.originalOrderCode || undefined,
      orderId: activeOrder.id,
      orderCode: result?.originalOrderCode || activeOrder.code || undefined,
      exchangedAt: new Date().toISOString(),
      reason,
      returnedValue: result?.refundValue ?? returnedValue,
      replacementValue: result?.newOrderTotal ?? replacementValue,
      differenceAmount: result?.difference ?? collectAmount,
      returnedLines: returnedLines
        .filter((line) => line.qty > 0)
        .map((line) => {
          const item = activeOrder.itemsSnapshot?.find((o) => o.productId === line.productId)
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
    activeOrder,
    collectAmount,
    reason,
    replacementLines,
    replacementValue,
    result,
    returnedLines,
    returnedValue,
  ])

  const receipt = buildFallbackReceipt()

  const leave = useCallback(() => {
    if (isProcessing || isPaymentOpen) return
    send({ type: 'RESET' })
    if (onDone) onDone()
    else if (router.canGoBack()) router.back()
    else router.replace('/(tab)/orders')
  }, [isProcessing, isPaymentOpen, onDone, router, send])

  useEffect(() => {
    if (!isCompleted) return
    const receiptKey =
      receipt?.exchangeId ||
      receipt?.exchangeCode ||
      result?.newOrder?.orderId ||
      result?.originalOrderId ||
      activeOrder?.id ||
      'exchange'

    const finish = async () => {
      try {
        if (receipt && receiptPrintRef.current && printedReceiptKeyRef.current !== receiptKey) {
          printedReceiptKeyRef.current = receiptKey
          await PrinterService.printComponent(receiptPrintRef)
        }
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi in phiếu đổi hàng')
      } finally {
        setIsPaymentOpen(false)
        send({ type: 'RESET' })
        if (onDone) onDone()
        else if (router.canGoBack()) router.back()
        else router.replace('/(tab)/orders')
      }
    }
    finish()
  }, [isCompleted, receipt, result, activeOrder, onDone, router, send])

  const submitExchange = useCallback(
    (payment: ExchangeSelectedPayment | null) => {
      send({ type: 'SUBMIT', payment })
    },
    [send],
  )

  const runChecklistThen = useCallback(
    (payment: ExchangeSelectedPayment | null, confirmMessage: string) => {
      const exchangeRequireChecklist = appSettings.get('exchangeRequireChecklist')
      if (exchangeRequireChecklist) {
        const items = [
          'Tôi đã nhận lại sản phẩm lỗi/cũ từ khách hàng.',
          'Tôi đã giao đầy đủ sản phẩm mới thay thế cho khách hàng.',
        ]
        if (payment && payment.amount > 0) {
          items.push(
            `Tôi đã thu đúng số tiền chênh lệch (${formatCurrency(payment.amount)}) qua ${
              payment.method === 'cash' ? 'tiền mặt' : payment.method === 'qr_bidv' ? 'QR' : 'thẻ'
            }.`,
          )
        }
        businessChecklistModalRef.current?.open({
          title: 'Checklist Xác nhận Nghiệp vụ',
          subtitle: 'Vui lòng xác nhận các bước nghiệp vụ trước khi hoàn tất đổi hàng.',
          items,
          onDontShowAgain: () => appSettings.set('exchangeRequireChecklist', false),
          onConfirm: () => submitExchange(payment),
        })
        return
      }
      toast.confirm({
        title: 'Xác nhận đổi hàng',
        message: confirmMessage,
        onConfirm: () => submitExchange(payment),
      })
    },
    [submitExchange],
  )

  const handleConfirmZero = useCallback(() => {
    if (!canSubmit) return
    runChecklistThen(
      null,
      `Bạn có chắc chắn muốn đổi ${selectedReturnCount} sản phẩm, hàng mới ${formatCurrency(
        replacementValue,
      )}, không phát sinh thu tiền?`,
    )
  }, [canSubmit, runChecklistThen, selectedReturnCount, replacementValue])

  const handlePaymentSuccess = useCallback(
    (paymentResult: PaymentResult) => {
      setIsPaymentOpen(false)
      const method = paymentResult.method

      if (method === 'qr_bidv' || method === 'card_bidv') {
        send({ type: 'PAYMENT_SUCCESS', paymentResult })
        return
      }

      if (!canSubmit) return
      if (method !== 'cash') {
        toast.error('Phương thức thanh toán không hỗ trợ cho đổi hàng.')
        return
      }

      const payment: ExchangeSelectedPayment = {
        method,
        // exchange API amount = business chênh lệch; popup payTotal có thể lệch 1đ do làm tròn tax
        amount: collectAmount,
        cashTendered: paymentResult.paidAmount,
        cashChange: paymentResult.change,
        provider: null,
        cardTerminalId: null,
        referenceCode: paymentResult.referenceCode || paymentResult.orderId,
      }
      runChecklistThen(
        payment,
        `Xác nhận đổi ${selectedReturnCount} sản phẩm, thu chênh lệch ${formatCurrency(
          collectAmount,
        )} (tiền mặt)?`,
      )
    },
    [canSubmit, collectAmount, runChecklistThen, selectedReturnCount, send],
  )

  const handlePaymentCancel = useCallback(() => {
    setIsPaymentOpen(false)
    send({ type: 'PAYMENT_CANCEL' })
  }, [send])

  const handleSelectPaymentMethod = useCallback(
    (methodType: string) => {
      if (!canSubmit || isProcessing) return

      if (methodType === 'cash') {
        const ref = popupRefs.current.cash
        if (!ref) {
          toast.error('Phương thức thanh toán chưa sẵn sàng.')
          return
        }
        setIsPaymentOpen(true)
        ref.open()
        return
      }

      const payment: ExchangeSelectedPayment = {
        method: methodType as ExchangePaymentMethod,
        amount: collectAmount,
        provider:
          methodType === 'qr_bidv' ? 'bidv' : methodType === 'card_bidv' ? 'card-bidv' : null,
        cardTerminalId: null,
      }

      runChecklistThen(
        payment,
        `Xác nhận đổi ${selectedReturnCount} sản phẩm, thu chênh lệch ${formatCurrency(
          collectAmount,
        )} qua ${methodType === 'qr_bidv' ? 'QR' : 'thẻ'}?`,
      )
    },
    [canSubmit, isProcessing, collectAmount, selectedReturnCount, runChecklistThen],
  )

  // Listen to state transition to open online payment popup once the exchange order has been submitted/initiated
  useEffect(() => {
    if (state.matches('waitingForOnlinePayment') && result?.newOrder) {
      const initiatedPayment = result.newOrder.payments?.find(
        (p: any) => p.state === 'INITIATED' && (p.method === 'qr_bidv' || p.method === 'card_bidv'),
      )

      if (initiatedPayment) {
        const method = initiatedPayment.method
        const ref = popupRefs.current[method]
        if (ref) {
          setIsPaymentOpen(true)
          if (method === 'qr_bidv') {
            ;(ref as ExchangeQrPaymentPopupRef).open({
              paymentId: initiatedPayment.paymentId,
              billNumber: result.newOrder.orderCode ?? result.newOrder.orderId,
            })
          } else if (method === 'card_bidv') {
            ;(ref as ExchangePortablePaymentPopupRef).open({
              paymentId: initiatedPayment.paymentId,
              checkoutResult: {
                orderId: result.newOrder.orderId,
                grandTotal: result.newOrder.grandTotal,
                taxTotal: result.newOrder.taxTotal ?? 0,
              },
            })
          }
        } else {
          toast.error('Phương thức thanh toán online chưa sẵn sàng.')
        }
      }
    }
  }, [state, result])

  const stepText = useMemo(() => {
    if (state.matches('fetchingOrderDetails')) return 'Đang tải chi tiết đơn...'
    if (state.matches('lookingUpScan')) return 'Đang quét mã sản phẩm đổi mới...'
    if (state.matches('submittingExchange')) return 'Đang xử lý đổi hàng...'
    if (state.matches('receivingReturnedItems')) return 'Đang nhập kho hàng trả...'
    if (state.matches('issuingReplacementItems')) return 'Đang xuất kho hàng đổi mới...'
    if (state.matches('completed')) return 'Đổi hàng hoàn tất'
    if (collectAmount > 0) return 'Chọn hàng và thu chênh lệch'
    return 'Chọn hàng trả và hàng đổi mới'
  }, [state, collectAmount])

  if (!activeOrder) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-lg text-surface-on-variant">Không tìm thấy đơn hàng</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {receipt && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={receiptPrintRef}>
            <ExchangeBillTemplate receipt={receipt} />
          </View>
        </View>
      )}

      {!isPaymentOpen && (
        <HardwareBarcodeScanner onScan={(codes) => send({ type: 'SCAN_CODES', codes })} />
      )}

      <View
        className="flex-row items-center justify-between px-6 py-4"
        style={{ borderBottomWidth: 1, borderColor: '#DFE0E1', backgroundColor: '#fff' }}
      >
        <View>
          <Text
            className="text-2xl font-extrabold"
            style={{ color: '#1C4E68', fontFamily: 'Manrope-Bold' }}
          >
            Đổi hàng
          </Text>
          <Text
            className="mt-1 text-base font-bold"
            style={{ color: '#747475', fontFamily: 'Manrope-Bold' }}
          >
            {activeOrder.code || activeOrder.id} · {stepText}
          </Text>
        </View>
        <IconButton
          icon={X}
          size={28}
          color="#747475"
          onPress={leave}
          disabled={isProcessing || isPaymentOpen}
        />
      </View>

      <View className="flex-1 flex-row px-3 pb-3 pt-2">
        <View
          className="flex-1 overflow-hidden rounded-[12px] bg-white"
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
            isDraft={state.matches('draft')}
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

        <View className="ml-2 flex-1 overflow-hidden rounded-[12px] border border-outline-variant bg-surface-50">
          <ExchangeReplacementSearchPanel
            isDraft={state.matches('draft')}
            isProcessing={isProcessing}
            onSelectProduct={(product: UnifiedProduct) =>
              send({ type: 'ADD_REPLACEMENT_ITEM', product })
            }
          />
          <ExchangeReplacementItemsList
            lines={replacementLines}
            isDraft={state.matches('draft')}
            isProcessing={isProcessing}
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
            isOriginalOrderVoucherApplied={isOriginalOrderVoucherApplied}
            canSubmit={canSubmit}
            isProcessing={isProcessing}
            processingText={stepText}
            paymentMethods={activePaymentMethods}
            onClose={leave}
            onConfirmZero={handleConfirmZero}
            onSelectPaymentMethod={handleSelectPaymentMethod}
          />
        </View>
      </View>

      <BusinessChecklistModal ref={businessChecklistModalRef} />

      {/* Popup POS gốc — total = grandTotal settlement (khớp lines), không phải raw collectAmount */}
      <CashPaymentPopup
        ref={(r) => {
          popupRefs.current.cash = r
        }}
        total={paymentTotal}
        discount={0}
        items={paymentItems}
        staffId={employee?.id ?? ''}
        shiftId={cashSessionId ?? ''}
        activeSessionId={cashSessionId}
        staffName={employee?.displayName}
        onSuccess={handlePaymentSuccess}
      />
      <ExchangeQrPaymentPopup
        ref={(r) => {
          popupRefs.current.qr_bidv = r
        }}
        total={paymentTotal}
        discount={0}
        items={paymentItems}
        staffId={employee?.id ?? ''}
        shiftId={cashSessionId ?? ''}
        activeSessionId={cashSessionId}
        staffName={employee?.displayName}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
      <ExchangePortablePaymentPopup
        ref={(r) => {
          popupRefs.current.card_bidv = r
        }}
        total={paymentTotal}
        discount={0}
        items={paymentItems}
        staffId={employee?.id ?? ''}
        shiftId={cashSessionId ?? ''}
        activeSessionId={cashSessionId}
        staffName={employee?.displayName}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </SafeAreaView>
  )
})
