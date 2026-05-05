import { Button, ModalBase, Numpad } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { Text, View } from 'react-native'
import { Banknote } from 'lucide-react-native'
import { COLORS } from '@/shared/constants'
import { ViceService } from '@/screens/vice-service'

import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { PaymentPopupProps, PaymentPopupRef } from '../types'

export const CashPaymentPopup = forwardRef<PaymentPopupRef, PaymentPopupProps>(
  ({ total, onSuccess }, ref) => {
    const [visible, setVisible] = useState(false)
    const [cashTendered, setCashTendered] = useState('')

    useImperativeHandle(ref, () => ({
      open: () => {
        setCashTendered('')
        setVisible(true)
        ViceService.showCashPayment({ total, customerPaid: 0, change: 0 })
      },
      close: () => {
        setVisible(false)
      },
    }))

    // Debounce cập nhật Vice Screen để tránh lag
    useEffect(() => {
      if (!visible) return

      const timer = setTimeout(() => {
        const paid = Number(cashTendered) || 0
        const changeAmt = paid >= total ? paid - total : 0
        ViceService.showCashPayment({ total, customerPaid: paid, change: changeAmt })
      }, 300)

      return () => clearTimeout(timer)
    }, [cashTendered, total, visible])

    const handleNumpadPress = (digit: string) => {
      if (cashTendered.length < 12) {
        setCashTendered((prev) => prev + digit)
      }
    }

    const handleNumpadBackspace = () => {
      setCashTendered((prev) => prev.slice(0, -1))
    }

    const handleNumpadClear = () => {
      setCashTendered('')
    }

    const handleClose = () => {
      setVisible(false)
    }

    const handleSuccess = () => {
      setVisible(false)
      const paid = Number(cashTendered) || 0
      const changeAmt = paid >= total ? paid - total : 0
      ViceService.paymentSuccess({ total, customerPaid: paid, change: changeAmt })
      onSuccess({
        success: true,
        method: PaymentMethod.CASH,
        paidAmount: paid,
        change: changeAmt,
        isOnline: false,
      })
    }

    // Dynamic VNĐ bill suggestions matching banking behaviors
    const getSuggestions = (amount: number, typed: string) => {
      if (typed) {
        const cleanTyped = typed.replace(/[^0-9]/g, '')
        if (cleanTyped) {
          return [
            Number(cleanTyped + '000'),
            Number(cleanTyped + '0000'),
            Number(cleanTyped + '00000'),
          ]
        }
      }

      const baseSuggestions = [
        Math.ceil(amount / 10000) * 10000,
        Math.ceil(amount / 50000) * 50000,
        Math.ceil(amount / 100000) * 100000,
        Math.ceil(amount / 200000) * 200000,
        Math.ceil(amount / 500000) * 500000,
      ]
      return Array.from(new Set(baseSuggestions))
        .filter((val) => val > amount)
        .sort((a, b) => a - b)
        .slice(0, 3)
    }

    const suggestions = getSuggestions(total, cashTendered)

    return (
      <ModalBase visible={visible} onClose={handleClose} className="max-w-[860px] flex-row">
        {/* Left Side: Transaction Details */}
        <View className="flex-1 justify-between border-r border-outline-variant bg-surface-100 p-8">
          <View>
            <View className="mb-6 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Banknote size={24} color={COLORS.primary.default} />
              </View>
              <Text className="text-2xl font-bold text-surface-on">Thanh toán Tiền mặt</Text>
            </View>

            <View className="gap-4">
              {/* Total Amount */}
              <View className="rounded-xl border border-outline-variant bg-surface-50 p-4">
                <Text className="text-surface-onVariant mb-1 text-sm font-medium">Tổng tiền</Text>
                <Text className="text-3xl font-bold text-primary">{formatCurrency(total)}</Text>
              </View>

              {/* Cash Tendered */}
              <View className="rounded-xl border-2 border-primary bg-primary/5 p-4">
                <Text className="mb-1 text-sm font-bold text-primary">Khách đưa</Text>
                <Text className="text-3xl font-bold text-surface-on">
                  {cashTendered ? formatCurrency(Number(cashTendered)) : '0 đ'}
                </Text>
              </View>

              {/* Change Due */}
              <View className="rounded-xl border border-error/20 bg-error/10 p-4">
                <Text className="mb-1 text-sm font-medium text-error">Tiền thừa</Text>
                <Text className="text-2xl font-bold text-error">
                  {Number(cashTendered) >= total
                    ? formatCurrency(Number(cashTendered) - total)
                    : '0 đ'}
                </Text>
              </View>
            </View>
          </View>

          {/* Denomination Shortcuts */}
          <View className="mt-6">
            <Text className="text-surface-onVariant mb-3 text-xs font-bold uppercase tracking-wider">
              Gợi ý nhanh
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {suggestions.map((amount) => (
                <Button
                  key={amount}
                  label={formatCurrency(amount)}
                  variant="outline"
                  className="h-12 min-w-[110px] flex-1"
                  onPress={() => setCashTendered(amount.toString())}
                />
              ))}
              <Button
                label="Chẵn tiền"
                variant="outline"
                className="h-12 min-w-[110px] flex-1"
                onPress={() => setCashTendered(total.toString())}
              />
            </View>
          </View>
        </View>

        {/* Right Side: Numpad & Actions */}
        <View className="w-[360px] justify-between bg-surface-50 p-8">
          <View>
            <Numpad
              onPress={handleNumpadPress}
              onBackspace={handleNumpadBackspace}
              onClear={handleNumpadClear}
            />
          </View>

          {/* Action Buttons */}
          <View className="mt-8 gap-3">
            <Button
              label="Hoàn tất"
              variant="primary"
              disabled={Number(cashTendered) < total}
              onPress={handleSuccess}
              className="h-14"
            />

            <Button
              label="Hủy giao dịch"
              variant="outline"
              onPress={handleClose}
              className="h-12"
            />
          </View>
        </View>
      </ModalBase>
    )
  },
)

CashPaymentPopup.displayName = 'CashPaymentPopup'
export default CashPaymentPopup
