import { COLORS } from '@/shared/constants'
import {
  useCashSessionId,
  useEmployee,
  usePaymentMethods,
} from '@/shared/features/app/hooks/use-app-context'
import {
  calculateSubtotal,
  calculateTotalQuantity,
  calculateTotalTax,
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  PaymentPopupRef,
  useApplyVoucher,
} from '@/shared/features/payment'
import * as Clipboard from 'expo-clipboard'

import { PrinterService } from '@/shared/services'
import { useConnectionStore } from '@/shared/store'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@xstate/react'
import { PenSquare, Ticket, User, XCircle } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ActorRefFrom } from 'xstate'
import { useActiveCart } from '../hooks'
import { cartMachine } from '../machines/cart.machine'
import { CartItem } from '../types/cart.types'
import { VoucherDetailModal, VoucherDetailModalRef } from './voucher-detail-modal'

// ─── Mỗi sub-component tự subscribe selector riêng ───

const CustomerInfoCard = memo(function CustomerInfoCard({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const affiliate = useSelector(cartActor!, (s) => s?.context?.affiliate ?? null)

  const handleCopyCode = useCallback(async () => {
    if (!affiliate) return
    if (affiliate.agentType === 'agent' || affiliate.agentType === 'collaborator') {
      await Clipboard.setStringAsync(affiliate.code)
      toast.success(`Đã copy mã: ${affiliate.code}`)
    }
  }, [affiliate])

  return (
    <View className="min-h-[72px] flex-row items-center justify-between rounded-2xl border border-outline-variant bg-slate-50 px-4 py-4">
      <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User size={22} color={COLORS.primary.default} />
        </View>
        <View className="min-w-0 flex-1">
          {affiliate ? (
            <View className="gap-0.5">
              <Text
                className="text-[24px] font-black text-[#FB6514]"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {affiliate.name}
              </Text>
              <Pressable
                onPress={handleCopyCode}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Text
                  className="text-[22px] font-bold text-primary"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {affiliate.agentType === 'agent'
                    ? 'Đối tác'
                    : affiliate.agentType === 'collaborator'
                      ? 'CTV'
                      : 'Khách lẻ'}{' '}
                  • {affiliate.code}
                </Text>
              </Pressable>
              {!!affiliate.phone && (
                <Text className="text-[18px] font-bold text-surface-on-variant" numberOfLines={1}>
                  {affiliate.phone}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-[18px] font-black text-surface-on">Khách lẻ</Text>
          )}
        </View>
      </View>
      {affiliate?.agentType === 'agent' && affiliate.isDebt && (
        <View className="rounded-lg border border-error/20 bg-error/10 px-3 py-1.5">
          <Text className="text-[13px] font-black uppercase tracking-widest text-error">
            Công nợ
          </Text>
        </View>
      )}
    </View>
  )
})

const NoteInput = memo(function NoteInput({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const note = useSelector(cartActor!, (s) => s?.context?.note || '')
  const [localNote, setLocalNote] = useState(note)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCartActorRef = useRef(cartActor)

  // Sync local note & hủy timer dở dang khi chuyển phiên tab
  useEffect(() => {
    if (lastCartActorRef.current !== cartActor) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      lastCartActorRef.current = cartActor
    }
    setLocalNote(note)
  }, [cartActor, note])

  const handleChangeNote = useCallback(
    (text: string) => {
      setLocalNote(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        cartActor?.send({ type: 'SET_NOTE', note: text })
      }, 150)
    },
    [cartActor],
  )

  // Cleanup debounce khi unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <View className="min-h-[64px] flex-1 flex-row items-start gap-3 rounded-2xl border border-outline-variant bg-white px-4 py-3">
      <PenSquare className="mt-1" size={22} color={COLORS.muted} />
      <TextInput
        className="m-0 flex-1 text-[18px] font-bold text-surface-on"
        placeholder="Nhập ghi chú đơn hàng..."
        placeholderTextColor="#8D8E8F"
        value={localNote}
        onChangeText={handleChangeNote}
        multiline
        textAlignVertical="top"
      />
    </View>
  )
})

const VoucherRow = memo(function VoucherRow({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const appliedVoucher = useSelector(cartActor!, (s) => s?.context?.appliedVoucher || null)
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const applyVoucherMutation = useApplyVoucher()
  const isVerifying = applyVoucherMutation.isPending
  const voucherModalRef = useRef<VoucherDetailModalRef>(null)
  const [voucherInput, setVoucherInput] = useState('')

  // Sync input khi đổi phiên tab (cartActor) hoặc thay đổi appliedVoucher
  useEffect(() => {
    setVoucherInput(appliedVoucher?.code || '')
  }, [cartActor, appliedVoucher])

  const handleOpenVoucherModal = useCallback(() => {
    if (appliedVoucher) {
      voucherModalRef.current?.open(appliedVoucher)
    }
  }, [appliedVoucher])

  const handleApplyVoucher = useCallback(async () => {
    if (!isNetworkConnected) {
      toast.error('Không thể áp dụng voucher khi ngoại tuyến')
      return
    }
    if (!voucherInput.trim()) return
    try {
      const response = await applyVoucherMutation.mutateAsync({ code: voucherInput })
      cartActor?.send({ type: 'APPLY_VOUCHER', voucher: response })
      setVoucherInput(response.code)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    }
  }, [voucherInput, applyVoucherMutation, isNetworkConnected, cartActor])

  const handleRemoveVoucher = useCallback(() => {
    cartActor?.send({ type: 'REMOVE_VOUCHER' })
  }, [cartActor])

  return (
    <View className="min-h-[64px] flex-row items-center gap-3 rounded-2xl border border-outline-variant bg-white px-4">
      <Pressable
        onPress={handleOpenVoucherModal}
        disabled={!appliedVoucher}
        className="p-1 active:opacity-60"
      >
        <Ticket size={22} color={appliedVoucher ? COLORS.primary.default : COLORS.muted} />
      </Pressable>
      <TextInput
        className="m-0 min-h-[52px] flex-1 py-2 text-[18px] font-bold text-surface-on"
        placeholder="Nhập mã giảm giá"
        placeholderTextColor="#8D8E8F"
        value={voucherInput}
        onChangeText={setVoucherInput}
        autoCapitalize="characters"
        editable={isNetworkConnected && !appliedVoucher && !isVerifying}
      />
      <View className="mx-1 h-6 w-px bg-outline-variant" />
      {appliedVoucher ? (
        <Pressable
          className="min-h-[44px] min-w-[72px] flex-row items-center justify-center gap-1.5 px-2"
          onPress={handleRemoveVoucher}
        >
          <XCircle size={20} color={COLORS.error.default} />
          <Text className="text-[17px] font-bold text-error">Hủy</Text>
        </Pressable>
      ) : (
        <Pressable
          className="min-h-[44px] min-w-[80px] items-center justify-center px-2"
          onPress={handleApplyVoucher}
          disabled={!voucherInput.trim() || isVerifying || !isNetworkConnected}
          style={({ pressed }) => [
            {
              opacity:
                !voucherInput.trim() || isVerifying || !isNetworkConnected
                  ? 0.4
                  : pressed
                    ? 0.7
                    : 1,
            },
          ]}
        >
          <Text className="text-[17px] font-bold text-primary">
            {isVerifying ? '...' : 'Áp dụng'}
          </Text>
        </Pressable>
      )}
      <VoucherDetailModal ref={voucherModalRef} />
    </View>
  )
})

const OrderSummary = memo(function OrderSummary({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const appliedVoucher = useSelector(cartActor!, (s) => s?.context?.appliedVoucher || null)
  const cart = useMemo(() => Object.values(items) as CartItem[], [items])
  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])
  const totalQty = useMemo(() => calculateTotalQuantity(cart), [cart])
  const discount = useMemo(
    () => calculateVoucherDiscount(cart, appliedVoucher),
    [cart, appliedVoucher],
  )
  const tax = useMemo(() => calculateTotalTax(cart, appliedVoucher), [cart, appliedVoucher])
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])

  return (
    <View className="flex-1 justify-between rounded-2xl border border-outline-variant/60 bg-slate-50 px-4 py-4">
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[21px] font-bold text-surface-on-variant">Số lượng</Text>
          <Text className="text-[21px] font-bold text-surface-on" numberOfLines={1}>
            {totalQty}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[21px] font-bold text-surface-on-variant">Tạm tính</Text>
          <Text className="text-[21px] font-bold text-surface-on" numberOfLines={1}>
            {formatCurrency(subtotal)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[21px] font-bold text-surface-on-variant">Thuế</Text>
          <Text className="text-[21px] font-bold text-surface-on" numberOfLines={1}>
            {formatCurrency(tax)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[21px] font-bold text-surface-on-variant">Giảm giá</Text>
          <Text className="text-[21px] font-bold text-success" numberOfLines={1}>
            -{formatCurrency(discount)}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-outline-variant pt-4">
        <Text className="text-[24px] font-extrabold text-surface-on">Tổng cộng</Text>
        <Text
          className="text-[36px] font-black text-[#FB6514]"
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  )
})

const BUTTON_ACTIVE_STYLE = { boxShadow: '0px 3px 0px #EBEBEB' } as const

const PaymentMethodButton = memo(function PaymentMethodButton({
  type,
  label,
  icon: Icon,
  isDisabled,
  isDebt,
  onPress,
}: {
  type: string
  label: string
  icon?: React.ComponentType<any>
  isDisabled: boolean
  isDebt: boolean
  onPress: (type: string) => void
}) {
  const handlePress = useCallback(() => onPress(type), [onPress, type])

  return (
    <Pressable
      disabled={isDisabled}
      onPress={handlePress}
      className={`min-h-[86px] flex-1 flex-row items-center justify-center gap-3 rounded-2xl border px-3 ${
        isDebt ? 'border-error bg-error' : 'border-outline-variant bg-primary'
      } ${isDisabled ? 'opacity-45' : 'opacity-100'}`}
      style={!isDisabled ? (BUTTON_ACTIVE_STYLE as any) : undefined}
    >
      {Icon ? <Icon size={34} color="#ffffff" width={34} height={34} fill="#ffffff" /> : null}
      <Text className="text-center text-[22px] font-bold text-white" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
})

const PaymentButtons = memo(function PaymentButtons({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const paymentMethods = usePaymentMethods()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const isPosConnected = useConnectionStore((s) => s.isPosConnected)
  const { items, appliedVoucher, activeSessionId, affiliate } = useSelector(
    cartActor!,
    (s) => ({
      items: s?.context?.items || {},
      appliedVoucher: s?.context?.appliedVoucher || null,
      activeSessionId: s?.context?.id || null,
      affiliate: s?.context?.affiliate ?? null,
    }),
    (prev, next) =>
      prev.items === next.items &&
      prev.appliedVoucher === next.appliedVoucher &&
      prev.activeSessionId === next.activeSessionId &&
      prev.affiliate === next.affiliate,
  )
  const printRef = useRef(null)
  const popupRefs = useRef<Record<string, PaymentPopupRef | null>>({})
  const queryClient = useQueryClient()
  const employee = useEmployee()
  const cashSessionId = useCashSessionId()

  const cart = useMemo(() => Object.values(items) as CartItem[], [items])
  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])
  const discount = useMemo(
    () => calculateVoucherDiscount(cart, appliedVoucher),
    [cart, appliedVoucher],
  )
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])
  const maxAllowedDebt = useMemo(() => {
    if (!affiliate) return null
    return affiliate.remainingCredit !== undefined && affiliate.remainingCredit !== null
      ? affiliate.remainingCredit
      : (affiliate.creditLimit ?? null)
  }, [affiliate])

  const activeStrategies = useMemo(() => {
    let list = []
    if (!paymentMethods || paymentMethods.length === 0) {
      list = [...PAYMENT_REGISTRY]
    } else {
      list = paymentMethods
        .map((method) => {
          const originalStrategy = PAYMENT_REGISTRY.find((s) => s.type === method.code)
          if (!originalStrategy) return null
          return {
            ...originalStrategy,
            label: method.name,
            displayOrder: method.displayOrder || 99,
            enabled: method.enabled,
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
    }
    const hasMix = list.some((s) => s.type === 'mix')
    if (!hasMix) {
      const mixStrategy = PAYMENT_REGISTRY.find((s) => s.type === 'mix')
      if (mixStrategy) list.push({ ...mixStrategy, displayOrder: 100 })
    }
    if (affiliate?.agentType === 'agent') {
      const hasDebt = list.some((s) => s.type === 'cong_no')
      if (!hasDebt) {
        const debtStrategy = PAYMENT_REGISTRY.find((s) => s.type === 'cong_no')
        if (debtStrategy) list.push({ ...debtStrategy, displayOrder: 101 })
      }
    }
    return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
  }, [paymentMethods, affiliate])

  const isVoucherInvalid = useMemo(() => {
    if (!appliedVoucher) return false
    if (appliedVoucher.minOrderValue !== null && subtotal < appliedVoucher.minOrderValue)
      return true
    if (appliedVoucher.applicableVariantIds && appliedVoucher.applicableVariantIds.length > 0) {
      const hasEligibleProduct = cart.some((item) =>
        appliedVoucher.applicableVariantIds?.includes(item.product.id),
      )
      if (!hasEligibleProduct) return true
    }
    return false
  }, [appliedVoucher, subtotal, cart])

  const paymentContext: PaymentContext = useMemo(
    () => ({ total, sessionId: activeSessionId, items: cart, discount, printRef, affiliate }),
    [total, activeSessionId, cart, discount, printRef, affiliate],
  )

  const cartActorRef = useRef(cartActor)
  cartActorRef.current = cartActor

  const handleCheckoutSuccess = useCallback(
    (method?: string) => {
      cartActorRef.current?.send({ type: 'CLEAR_CART' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' })
      PrinterService.openCashBox().catch((err: any) =>
        toast.error('Lỗi mở két: ' + (err?.message ?? 'Không xác định')),
      )
      toast.success(method === 'cong_no' ? 'Ghi nợ thành công!' : 'Thanh toán thành công!')
    },
    [queryClient],
  )

  const handleStartPayment = useCallback((methodType: string) => {
    const popupRef = popupRefs.current[methodType]
    if (popupRef) {
      popupRef.open()
    } else {
      toast.error('Phương thức thanh toán này chưa được hỗ trợ')
    }
  }, [])

  const paymentRows = useMemo(() => {
    const rows: any[] = []
    for (let i = 0; i < activeStrategies.length; i += 2) rows.push(activeStrategies.slice(i, i + 2))
    return rows
  }, [activeStrategies])

  return (
    <View className="w-[430px] justify-end gap-3">
      {((isVoucherInvalid && appliedVoucher && cart.length > 0) ||
        (affiliate?.agentType === 'agent' &&
          (!affiliate.isDebt || (maxAllowedDebt !== null && total > maxAllowedDebt)))) && (
        <View className="mb-2 gap-1 rounded-2xl border border-error/20 bg-red-100 p-4">
          {isVoucherInvalid && appliedVoucher && cart.length > 0 && (
            <Text className="text-[15px] font-bold text-red-800">
              {appliedVoucher.minOrderValue !== null && subtotal < appliedVoucher.minOrderValue
                ? `⚠ Đơn hàng chưa đạt tối thiểu ${formatCurrency(appliedVoucher.minOrderValue)} để dùng mã.`
                : '⚠ Giỏ hàng không chứa sản phẩm được áp dụng mã này.'}
            </Text>
          )}
          {affiliate?.agentType === 'agent' && !affiliate.isDebt && (
            <Text className="text-[15px] font-bold text-red-800">
              ⚠ Đối tác không được phép ghi nợ
            </Text>
          )}
          {affiliate?.agentType === 'agent' &&
            affiliate.isDebt &&
            maxAllowedDebt !== null &&
            total > maxAllowedDebt && (
              <Text className="text-[15px] font-bold text-error">
                ⚠ Vượt hạn mức công nợ (
                {affiliate.remainingCredit !== undefined && affiliate.remainingCredit !== null
                  ? formatCurrency(affiliate.remainingCredit)
                  : '0'}{' '}
                /{' '}
                {affiliate.creditLimit !== undefined && affiliate.creditLimit !== null
                  ? formatCurrency(affiliate.creditLimit)
                  : '∞'}
                )
              </Text>
            )}
        </View>
      )}

      {paymentRows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-4">
          {row.map((method: any) => {
            const isAvailable = method.isAvailable(paymentContext, !isNetworkConnected)
            const isDebt = method.type === 'cong_no'
            const isDebtDisabled =
              isDebt &&
              (!affiliate ||
                affiliate.agentType !== 'agent' ||
                affiliate.isDebt !== true ||
                (maxAllowedDebt !== null && total > maxAllowedDebt))
            const isDisabled =
              cart.length === 0 ||
              !isAvailable ||
              method.enabled === false ||
              (method.type === 'qr_bidv' && !isNetworkConnected) ||
              (method.type === 'cong_no' && !isNetworkConnected) ||
              (method.type === 'card_bidv' && !isPosConnected) ||
              isDebtDisabled ||
              isVoucherInvalid

            return (
              <PaymentMethodButton
                key={method.type}
                type={String(method.type)}
                label={method.label}
                icon={method.icon}
                isDisabled={isDisabled}
                isDebt={isDebt}
                onPress={handleStartPayment}
              />
            )
          })}
        </View>
      ))}

      {activeStrategies.map((method) => (
        <method.PopupComponent
          key={method.type}
          ref={(r: PaymentPopupRef | null) => {
            popupRefs.current[String(method.type)] = r
          }}
          total={total}
          discount={discount}
          appliedVoucher={appliedVoucher}
          items={cart}
          staffId={employee?.id ?? ''}
          shiftId={cashSessionId ?? ''}
          activeSessionId={activeSessionId}
          printRef={printRef}
          staffName={employee?.displayName}
          onSuccess={(result: any) => handleCheckoutSuccess(result?.method)}
          note={cartActor?.getSnapshot()?.context?.note || ''}
          affiliate={affiliate}
        />
      ))}
    </View>
  )
})

// ─── Main CheckoutPanel — chỉ layout, không data ───

const CheckoutPanel = memo(function CheckoutPanel() {
  const cartActor = useActiveCart()

  return (
    <View className="w-full" style={{ zIndex: 10 }}>
      <View className="w-full rounded-2xl border border-outline-variant bg-white p-4 shadow-sm">
        <View className="flex-row items-stretch gap-3">
          <View className="w-2/5 gap-3">
            <CustomerInfoCard cartActor={cartActor} />
            <NoteInput cartActor={cartActor} />
            <VoucherRow cartActor={cartActor} />
          </View>
          <OrderSummary cartActor={cartActor} />
          <PaymentButtons cartActor={cartActor} />
        </View>
      </View>
    </View>
  )
})

export default CheckoutPanel
