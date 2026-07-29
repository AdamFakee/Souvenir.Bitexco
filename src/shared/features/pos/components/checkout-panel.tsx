import { COLORS } from '@/shared/constants'
import { useAppContext } from '@/shared/features/app/hooks/use-app-context'
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
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useActiveCart, usePosActor } from '../hooks'
import { CartItem } from '../types/cart.types'

export default function CheckoutPanel() {
  const cartActor = useActiveCart()
  const { employee, cashSessionId, paymentMethods } = useAppContext()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const isPosConnected = useConnectionStore((s) => s.isPosConnected)

  // Get data from Actor (cần affiliate sớm cho activeStrategies)
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const activeSessionId = useSelector(cartActor!, (s) => s?.context?.id || null)
  const appliedVoucher = useSelector(cartActor!, (s) => s?.context?.appliedVoucher || null)
  const note = useSelector(cartActor!, (s) => s?.context?.note || '')
  const affiliate = useSelector(cartActor!, (s) => s?.context?.affiliate ?? null)

  // Lọc và ánh xạ động các nút thanh toán từ XState context.paymentMethods
  const activeStrategies = useMemo(() => {
    let list = []
    if (!paymentMethods || paymentMethods.length === 0) {
      list = [...PAYMENT_REGISTRY]
    } else {
      list = paymentMethods
        .map((method) => {
          // Tìm strategy tương ứng bằng PaymentMethodCode trực tiếp
          const originalStrategy = PAYMENT_REGISTRY.find((s) => s.type === method.code)
          if (!originalStrategy) return null

          // Trả về strategy được tùy chỉnh nhãn và cấu hình hiển thị động
          return {
            ...originalStrategy,
            label: method.name, // Đổi tên nút theo cấu hình API động!
            displayOrder: method.displayOrder || 99,
            enabled: method.enabled,
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
    }

    // Luôn thêm MixStrategy nếu chưa có
    const hasMix = list.some((s) => s.type === 'mix')
    if (!hasMix) {
      const mixStrategy = PAYMENT_REGISTRY.find((s) => s.type === 'mix')
      if (mixStrategy) {
        list.push({ ...mixStrategy, displayOrder: 100 })
      }
    }

    // Chỉ thêm DebtStrategy nếu phiên hiện tại là agent
    if (affiliate?.agentType === 'agent') {
      const hasDebt = list.some((s) => s.type === 'cong_no')
      if (!hasDebt) {
        const debtStrategy = PAYMENT_REGISTRY.find((s) => s.type === 'cong_no')
        if (debtStrategy) {
          list.push({ ...debtStrategy, displayOrder: 101 })
        }
      }
    }

    return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
  }, [paymentMethods, affiliate])

  const [voucherInput, setVoucherInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Sync voucherInput with appliedVoucher when switching sessions or clearing cart
  React.useEffect(() => {
    setVoucherInput(appliedVoucher?.code || '')
  }, [appliedVoucher])

  const applyVoucherMutation = useApplyVoucher()
  const isVerifying = applyVoucherMutation.isPending
  const printRef = useRef(null)

  // Refs cho từng popup — key là PaymentMethod type
  const popupRefs = useRef<Record<string, PaymentPopupRef | null>>({})

  const cart = useMemo(() => {
    return Object.values(items) as CartItem[]
  }, [items])

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])

  const totalQty = useMemo(() => calculateTotalQuantity(cart), [cart])

  const discount = useMemo(() => {
    return calculateVoucherDiscount(cart, appliedVoucher)
  }, [cart, appliedVoucher])

  const tax = useMemo(() => calculateTotalTax(cart, appliedVoucher), [cart, appliedVoucher])

  // Đơn giá sau thuế (Tax-inclusive): Tổng thanh toán = tạm tính - giảm giá
  const total = useMemo(() => {
    return Math.max(0, subtotal - discount)
  }, [subtotal, discount])

  const paymentContext: PaymentContext = useMemo(
    () => ({
      total,
      sessionId: activeSessionId,
      items: cart,
      discount,
      printRef,
      affiliate,
    }),
    [total, activeSessionId, cart, discount, printRef, affiliate],
  )

  const isVoucherInvalid = useMemo(() => {
    if (!appliedVoucher) return false

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (appliedVoucher.minOrderValue !== null && subtotal < appliedVoucher.minOrderValue) {
      return true
    }

    // Kiểm tra sản phẩm được áp dụng
    if (appliedVoucher.applicableVariantIds && appliedVoucher.applicableVariantIds.length > 0) {
      const hasEligibleProduct = cart.some((item) =>
        appliedVoucher.applicableVariantIds?.includes(item.product.id),
      )
      if (!hasEligibleProduct) {
        return true
      }
    }

    return false
  }, [appliedVoucher, subtotal, cart])

  const posActor = usePosActor()
  const queryClient = useQueryClient()

  const handleCheckoutSuccess = useCallback(
    (method?: string) => {
      cartActor?.send({ type: 'CLEAR_CART' })
      setVoucherInput('')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })

      PrinterService.openCashBox().catch((err: any) => {
        toast.error('Lỗi mở két: ' + (err?.message ?? 'Không xác định'))
      })

      if (method === 'cong_no') {
        toast.success('Ghi nợ thành công!')
      } else {
        toast.success('Thanh toán thành công!')
      }
    },
    [cartActor, queryClient, setVoucherInput],
  )

  /** Mở popup tương ứng với phương thức thanh toán */
  const handleStartPayment = useCallback((methodType: string) => {
    const popupRef = popupRefs.current[methodType]
    if (popupRef) {
      popupRef.open()
    } else {
      toast.error('Phương thức thanh toán này chưa được hỗ trợ')
    }
  }, [])

  const handleApplyVoucher = useCallback(async () => {
    if (!voucherInput.trim()) return

    try {
      const response = await applyVoucherMutation.mutateAsync({
        code: voucherInput,
      })
      console.log('[POS Voucher Verify Response]:', JSON.stringify(response, null, 2))
      cartActor?.send({ type: 'APPLY_VOUCHER', voucher: response })
      setVoucherInput(response.code)
      // toast.success(`Đã áp dụng mã giảm giá: ${response.code}`)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    }
  }, [voucherInput, applyVoucherMutation, cartActor])

  const handleRemoveVoucher = useCallback(() => {
    cartActor?.send({ type: 'REMOVE_VOUCHER' })
  }, [cartActor])

  const paymentRows = useMemo(() => {
    const rows: (typeof activeStrategies)[] = []
    for (let i = 0; i < activeStrategies.length; i += 2) {
      rows.push(activeStrategies.slice(i, i + 2))
    }
    return rows
  }, [activeStrategies])

  return (
    <KeyboardAvoidingView
      behavior={isFocused ? 'padding' : undefined}
      keyboardVerticalOffset={24}
      className="w-full"
      style={{ zIndex: 10 }}
    >
      <View className="w-full rounded-2xl border border-outline-variant bg-white p-4 shadow-sm">
        <View className="flex-row items-stretch gap-3">
          {/* Col 1: khách + ghi chú + voucher */}
          <View className="w-2/5 gap-3">
            <View className="min-h-[72px] flex-row items-center justify-between rounded-2xl border border-outline-variant bg-slate-50 px-4 py-4">
              <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User size={22} color={COLORS.primary.default} />
                </View>
                <View className="min-w-0 flex-1">
                  {affiliate ? (
                    <View className="gap-0.5">
                      <Text
                        className="text-[18px] font-black text-surface-on"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {affiliate.name}
                      </Text>
                      <Pressable
                        onPress={async () => {
                          if (
                            affiliate.agentType === 'agent' ||
                            affiliate.agentType === 'collaborator'
                          ) {
                            await Clipboard.setStringAsync(affiliate.code)
                            toast.success(`Đã copy mã: ${affiliate.code}`)
                          }
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text
                          className="text-[15px] font-bold text-primary"
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
                        <Text
                          className="text-[15px] font-bold text-surface-on-variant"
                          numberOfLines={1}
                        >
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

            <View className="min-h-[64px] flex-1 flex-row items-start gap-3 rounded-2xl border border-outline-variant bg-white px-4 py-3">
              <PenSquare className="mt-1" size={22} color={COLORS.muted} />
              <TextInput
                className="m-0 flex-1 text-[18px] font-bold text-surface-on"
                placeholder="Nhập ghi chú đơn hàng..."
                placeholderTextColor="#8D8E8F"
                value={note}
                onChangeText={(text) => cartActor?.send({ type: 'SET_NOTE', note: text })}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="min-h-[64px] flex-row items-center gap-3 rounded-2xl border border-outline-variant bg-white px-4">
              <Ticket size={22} color={appliedVoucher ? COLORS.primary.default : COLORS.muted} />
              <TextInput
                className="m-0 min-h-[52px] flex-1 py-2 text-[18px] font-bold text-surface-on"
                placeholder="Nhập mã giảm giá"
                placeholderTextColor="#8D8E8F"
                value={voucherInput}
                onChangeText={setVoucherInput}
                autoCapitalize="characters"
                editable={!appliedVoucher && !isVerifying}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <View className="mx-1 h-6 w-px bg-outline-variant" />
              {appliedVoucher ? (
                <Pressable
                  className="min-h-[44px] min-w-[72px] flex-row items-center justify-center gap-1.5 px-2"
                  onPress={handleRemoveVoucher}
                  accessibilityRole="button"
                  accessibilityLabel="Hủy mã giảm giá"
                >
                  <XCircle size={20} color={COLORS.error.default} />
                  <Text className="text-[17px] font-bold text-error">Hủy</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="min-h-[44px] min-w-[80px] items-center justify-center px-2"
                  onPress={handleApplyVoucher}
                  disabled={!voucherInput.trim() || isVerifying}
                  accessibilityRole="button"
                  accessibilityLabel="Áp dụng mã giảm giá"
                  style={({ pressed }) => [
                    { opacity: !voucherInput.trim() || isVerifying ? 0.4 : pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text className="text-[17px] font-bold text-primary">
                    {isVerifying ? '...' : 'Áp dụng'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Col 2: tổng tiền */}
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

          {/* Col 3: PTTT — nút to, dễ bấm tablet */}
          <View className="w-[430px] justify-end gap-3">
            {/* Warnings Container at the top of Col 3 to prevent layout shifts */}
            {((isVoucherInvalid && appliedVoucher && cart.length > 0) ||
              (affiliate?.agentType === 'agent' &&
                (!affiliate.isDebt ||
                  (affiliate.creditLimit !== undefined &&
                    affiliate.creditLimit !== null &&
                    total > affiliate.creditLimit)))) && (
              <View className="mb-2 gap-1 rounded-2xl border border-red-200/60 bg-red-50 p-4">
                {isVoucherInvalid && appliedVoucher && cart.length > 0 && (
                  <Text className="text-[15px] font-bold text-red-800">
                    {appliedVoucher.minOrderValue !== null &&
                    subtotal < appliedVoucher.minOrderValue
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
                  affiliate.creditLimit !== undefined &&
                  affiliate.creditLimit !== null &&
                  total > affiliate.creditLimit && (
                    <Text className="text-[15px] font-bold text-red-800">
                      ⚠ Vượt hạn mức công nợ ({formatCurrency(affiliate.creditLimit)})
                    </Text>
                  )}
              </View>
            )}

            {paymentRows.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-4">
                {row.map((method) => {
                  const isAvailable = method.isAvailable(paymentContext, !isNetworkConnected)
                  const isDebt = method.type === 'cong_no'
                  const isDebtDisabled =
                    isDebt &&
                    (!affiliate ||
                      affiliate.agentType !== 'agent' ||
                      affiliate.isDebt !== true ||
                      (affiliate.creditLimit !== undefined &&
                        affiliate.creditLimit !== null &&
                        total > affiliate.creditLimit))

                  const isDisabled =
                    cart.length === 0 ||
                    !isAvailable ||
                    method.enabled === false ||
                    (method.type === 'qr_bidv' && !isNetworkConnected) ||
                    (method.type === 'card_bidv' && !isPosConnected) ||
                    isDebtDisabled ||
                    isVoucherInvalid
                  const Icon = method.icon

                  return (
                    <Pressable
                      key={method.type}
                      disabled={isDisabled}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isDisabled }}
                      accessibilityLabel={method.label}
                      onPress={() => handleStartPayment(String(method.type))}
                      className={`min-h-[86px] flex-1 flex-row items-center justify-center gap-3 rounded-2xl border px-3 ${
                        isDebt ? 'border-error bg-error' : 'border-outline-variant bg-primary'
                      } ${isDisabled ? 'opacity-45' : 'opacity-100'}`}
                      style={
                        !isDisabled ? ({ boxShadow: '0px 3px 0px #EBEBEB' } as any) : undefined
                      }
                    >
                      {Icon ? (
                        <Icon size={34} color="#ffffff" width={34} height={34} fill="#ffffff" />
                      ) : null}
                      <Text
                        className="text-center text-[22px] font-bold text-white"
                        numberOfLines={1}
                      >
                        {method.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
        </View>

        {activeStrategies.map((method) => (
          <method.PopupComponent
            key={method.type}
            ref={(r) => {
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
            onSuccess={(result) => handleCheckoutSuccess(result.method)}
            note={note}
            affiliate={affiliate}
          />
        ))}
      </View>
    </KeyboardAvoidingView>
  )
}
