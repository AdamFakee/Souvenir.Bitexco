import DebtIcon from '@/assets/icons/Debt.svg'
import { Button, ModalBase, Shimmer } from '@/shared/components/ui'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { useActorRef, useSelector } from '@xstate/react'
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { debtPaymentMachine } from '../machines/debt-payment.machine'
import type {
  PaymentPopupProps,
  PaymentPopupRef,
  PaymentResult,
} from '../types/payment-strategy.type'

export const DebtPaymentPopup = forwardRef<PaymentPopupRef, PaymentPopupProps>(
  function DebtPaymentPopup(
    { total, items, affiliate, staffId, shiftId, appliedVoucher, discount, onSuccess },
    ref,
  ) {
    const [visible, setVisible] = useState(false)

    const actorRef = useActorRef(debtPaymentMachine, {
      input: {
        total,
        items,
        affiliateId: affiliate?.id ?? null,
        agentType: affiliate?.agentType ?? null,
        shiftId,
        discount,
        appliedVoucher: appliedVoucher || null,
      },
    })

    const machineState = useSelector(actorRef, (s) => s.value)
    const error = useSelector(actorRef, (s) => s.context.error)

    const isCheckingOut = machineState === 'checkingOut'
    const isError = machineState === 'error'
    const isDone = machineState === 'done'

    useImperativeHandle(ref, () => ({
      open: () => {
        // Reset machine với input mới mỗi lần mở — không giữ state cũ
        actorRef.send({
          type: 'START',
          input: {
            total,
            items,
            affiliateId: affiliate?.id ?? null,
            agentType: affiliate?.agentType ?? null,
            shiftId,
            discount,
            appliedVoucher: appliedVoucher || null,
          },
        })
        setVisible(true)
      },
      close: () => setVisible(false),
    }))

    const handleConfirm = () => {
      if (
        affiliate?.agentType === 'agent' &&
        affiliate.creditLimit !== undefined &&
        affiliate.creditLimit !== null
      ) {
        if (total > affiliate.creditLimit) {
          toast.infoPopup({
            title: 'Vượt hạn mức công nợ',
            message: 'Giao dịch vượt quá hạn mức công nợ cho phép của đối tác.',
          })
          return
        }
      }
      actorRef.send({ type: 'CONFIRM' })
    }

    const handleClose = () => {
      if (isCheckingOut) return
      setVisible(false)
    }

    const doneHandled = useRef(false)

    useEffect(() => {
      if (isDone && visible && !doneHandled.current) {
        doneHandled.current = true
        setVisible(false)
        const result: PaymentResult = {
          success: true,
          method: 'cong_no',
          paidAmount: total,
          change: 0,
          isOnline: true,
        }
        onSuccess(result)
      }
      if (!isDone) {
        doneHandled.current = false
      }
    }, [isDone, visible, total, onSuccess])

    useEffect(() => {
      if (isError && error) {
        // Thay vì toast.error thông thường, dùng toast.infoPopup nếu là lỗi vượt hạn mức từ server
        if (
          error.startsWith('order.credit_limit_exceeded') ||
          error.includes('hạn mức') ||
          error.includes('limit')
        ) {
          toast.infoPopup({
            title: 'Vượt hạn mức công nợ',
            message: 'Giao dịch vượt quá hạn mức công nợ cho phép của đối tác.',
          })
        } else {
          toast.error(error)
        }
      }
    }, [isError, error])

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        dismissible={!isCheckingOut}
        className="max-w-[680px]"
      >
        {visible && (
          <View className="gap-6 bg-surface-100 p-10">
            {/* Header */}
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                <DebtIcon width={32} height={32} />
              </View>
              <View className="w-full">
                <Text className="text-4xl font-bold text-surface-on">Thanh toán Công nợ</Text>
              </View>
            </View>

            {/* Affiliate info */}
            {affiliate && (
              <View className="gap-4 rounded-xl border border-outline-variant bg-surface-50 p-6">
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-xl font-medium text-muted">Đại lý</Text>
                  <Text
                    className="flex-1 text-right text-xl font-bold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.name}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-lg text-muted">Mã</Text>
                  <Text
                    className="flex-1 text-right text-lg font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.code}
                  </Text>
                </View>
                {!!affiliate.phone && (
                  <View className="flex-row items-center justify-between gap-4">
                    <Text className="shrink-0 text-lg text-muted">Số điện thoại</Text>
                    <Text
                      className="flex-1 text-right text-lg font-semibold text-surface-on"
                      numberOfLines={1}
                    >
                      {affiliate.phone}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-lg text-muted">Hạn mức nợ</Text>
                  <Text
                    className="flex-1 text-right text-lg font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.creditLimit !== undefined && affiliate.creditLimit !== null
                      ? formatCurrency(affiliate.creditLimit)
                      : 'Không giới hạn'}
                  </Text>
                </View>
              </View>
            )}

            {/* Total Amount */}
            <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-50 p-6">
              <Text className="mb-1 text-xl font-medium text-muted" numberOfLines={1}>
                Số tiền ghi nợ
              </Text>
              {isCheckingOut ? (
                <Shimmer className="mt-1 h-12 w-56 rounded-xl" />
              ) : (
                <Text className="text-5xl font-bold text-primary" numberOfLines={1}>
                  {formatCurrency(total)}
                </Text>
              )}
            </View>

            {/* Credit limit warning */}
            {affiliate?.agentType === 'agent' &&
              affiliate.creditLimit !== undefined &&
              affiliate.creditLimit !== null &&
              total > affiliate.creditLimit && (
                <View className="rounded-xl border border-error/30 bg-error/10 p-5">
                  <Text className="text-xl font-semibold text-error">
                    ⚠ Vượt hạn mức công nợ ({formatCurrency(affiliate.creditLimit)})
                  </Text>
                </View>
              )}

            {/* Error banner */}
            {isError && error && (
              <View className="rounded-xl border border-error/30 bg-error/10 p-6">
                <Text className="text-xl font-semibold text-error">⚠ {error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="gap-3">
              <Button
                label={isCheckingOut ? 'Đang xử lý...' : 'Xác nhận ghi nợ'}
                variant="primary"
                onPress={handleConfirm}
                disabled={isCheckingOut}
                loading={isCheckingOut}
                className="h-20"
              />
              <Button
                label="Hủy giao dịch"
                variant="error"
                onPress={handleClose}
                disabled={isCheckingOut}
                className="h-16"
              />
            </View>
          </View>
        )}
      </ModalBase>
    )
  },
)
