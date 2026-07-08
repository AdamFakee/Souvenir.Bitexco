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

import { useConnectionStore } from '@/shared/store'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@xstate/react'
import { PenSquare, Ticket, User, XCircle } from 'lucide-react-native'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
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
        .filter((method) => method.enabled)
        .map((method) => {
          // Tìm strategy tương ứng bằng PaymentMethodCode trực tiếp
          const originalStrategy = PAYMENT_REGISTRY.find((s) => s.type === method.code)
          if (!originalStrategy) return null

          // Trả về strategy được tùy chỉnh nhãn và cấu hình hiển thị động
          return {
            ...originalStrategy,
            label: method.name, // Đổi tên nút theo cấu hình API động!
            displayOrder: method.displayOrder || 99,
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

  const tax = useMemo(() => calculateTotalTax(cart), [cart])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount) + tax
  }, [subtotal, discount, tax])

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

  const posActor = usePosActor()
  const queryClient = useQueryClient()

  const handleCheckoutSuccess = useCallback(
    (method?: string) => {
      cartActor?.send({ type: 'CLEAR_CART' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (method === 'cong_no') {
        toast.success('Ghi nợ thành công!')
      } else {
        toast.success('Thanh toán thành công!')
      }
    },
    [cartActor, queryClient],
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
      cartActor?.send({ type: 'APPLY_VOUCHER', voucher: response })
      setVoucherInput(response.code)
      // toast.success(`Đã áp dụng mã giảm giá: ${response.code}`)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    }
  }, [voucherInput, applyVoucherMutation, cartActor])

  const handleRemoveVoucher = useCallback(() => {
    cartActor?.send({ type: 'REMOVE_VOUCHER' })
    // toast.info(' Đã gỡ mã giảm giá')
  }, [cartActor])
  return (
    <View className="h-full w-[320px] flex-col bg-background" style={{ zIndex: 10 }}>
      <View className="flex-1 flex-col justify-between px-3">
        {/* TOP SECTION: Expanding */}
        <View className="flex-1 flex-col gap-6">
          {/* Customer Box */}
          <View className="flex-row items-center justify-between rounded-[12px] border border-outline-variant bg-white p-3">
            <View className="flex-1 flex-row items-center gap-3 pr-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User size={20} color={COLORS.primary.default} />
              </View>
              <View className="flex-1 flex-col">
                <Text className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-muted">
                  Khách hàng
                </Text>
                {affiliate ? (
                  <View className="flex-col gap-0.5">
                    <Text
                      className="text-[16px] font-black text-surface-on"
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
                        className="text-[13px] font-bold text-primary"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {affiliate.agentType === 'agent'
                          ? 'Đại lý'
                          : affiliate.agentType === 'collaborator'
                            ? 'CTV'
                            : 'Khách lẻ'}{' '}
                        • {affiliate.code}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text className="text-[16px] font-black text-surface-on">Khách lẻ</Text>
                )}
              </View>
            </View>
            {affiliate?.agentType === 'agent' && affiliate.isDebt && (
              <View className="rounded-md border border-error/20 bg-error/10 px-2.5 py-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-error">
                  Công nợ
                </Text>
              </View>
            )}
          </View>

          {/* Note Box */}
          <View className="flex-row items-center gap-2 rounded-[12px] border border-outline-variant bg-white p-3">
            <PenSquare size={20} color={COLORS.muted} />
            <TextInput
              className="m-0 min-h-[24px] flex-1 p-0 text-[16px] font-bold text-surface-on"
              placeholder="Nhập ghi chú đơn hàng..."
              placeholderTextColor="#8D8E8F"
              value={note}
              onChangeText={(text) => cartActor?.send({ type: 'SET_NOTE', note: text })}
            />
          </View>

          {/* Voucher Input (Matching HTML style) */}
          <View className="flex-col gap-1">
            <View className="flex-row items-center gap-2 rounded-[12px] border border-outline-variant bg-white p-3">
              <Ticket size={20} color={appliedVoucher ? COLORS.primary.default : COLORS.muted} />
              <TextInput
                className="m-0 flex-1 p-0 text-[16px] font-bold text-surface-on"
                placeholder="Nhập mã giảm giá"
                placeholderTextColor="#8D8E8F"
                value={voucherInput}
                onChangeText={setVoucherInput}
                autoCapitalize="characters"
                editable={!appliedVoucher && !isVerifying}
              />

              {/* Divider */}
              <View className="mx-1 h-5 w-[1px] bg-outline-variant" />

              {/* Action Button inside Input */}
              {appliedVoucher ? (
                <Pressable
                  className="flex-row items-center gap-1.5 px-2"
                  onPress={handleRemoveVoucher}
                >
                  <XCircle size={18} color={COLORS.error.default} />
                  <Text className="text-[16px] font-bold text-error">Hủy</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="flex-row items-center gap-1.5 px-2"
                  onPress={handleApplyVoucher}
                  disabled={!voucherInput.trim() || isVerifying}
                >
                  <Text className="text-[16px] font-bold text-primary opacity-90">Áp dụng</Text>
                </Pressable>
              )}
            </View>

            {/* Applied Voucher Details removed per user request */}
          </View>

          {/* Calculation List (Matching HTML) */}
          <View className="mt-2 flex-col gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-surface-on-variant">Số lượng</Text>
              <Text className="text-[20px] font-bold text-surface-on-variant" numberOfLines={1}>
                {totalQty} món
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-surface-on-variant">Tạm tính</Text>
              <Text className="text-[20px] font-bold text-surface-on-variant" numberOfLines={1}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-surface-on-variant">Thuế</Text>
              <Text className="text-[20px] font-bold text-surface-on-variant" numberOfLines={1}>
                {formatCurrency(tax)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-surface-on-variant">Giảm giá</Text>
              <Text className="text-[20px] font-bold text-success" numberOfLines={1}>
                -{formatCurrency(discount)}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-surface-on">Tổng cộng</Text>
              <Text
                className="text-[26px] font-bold text-[#FB6514]"
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {formatCurrency(total)}
              </Text>
            </View>
          </View>
        </View>

        {/* BOTTOM SECTION: Payment Buttons (2 Columns) */}
        <View className="mt-6">
          {(() => {
            const rows = []
            for (let i = 0; i < activeStrategies.length; i += 2) {
              rows.push(activeStrategies.slice(i, i + 2))
            }
            return (
              <View className="gap-3">
                {rows.map((row, rowIndex) => (
                  <View key={rowIndex} className="flex-row gap-3">
                    {row.map((method) => {
                      const isAvailable = method.isAvailable(paymentContext, !isNetworkConnected)
                      const isDisabled =
                        cart.length === 0 ||
                        !isAvailable ||
                        (method.type === 'qr_bidv' && !isNetworkConnected) ||
                        (method.type === 'card_bidv' && !isPosConnected)

                      const Icon = method.icon

                      return (
                        <Pressable
                          key={method.type}
                          disabled={isDisabled}
                          onPress={() => handleStartPayment(String(method.type))}
                          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant py-4 ${method.type === 'cong_no' ? 'border-error bg-error' : 'bg-primary'} ${isDisabled ? 'opacity-50' : 'opacity-100'}`}
                          style={
                            {
                              boxShadow: '0px 3px 0px #EBEBEB',
                            } as any
                          }
                        >
                          {Icon && (
                            <Icon size={24} color="#ffffff" width={24} height={24} fill="#ffffff" />
                          )}
                          <Text className="text-center text-[16px] font-bold text-white">
                            {method.label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                ))}
              </View>
            )
          })()}
        </View>
      </View>

      {/* Render Popups động từ Registry */}
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
  )
}
