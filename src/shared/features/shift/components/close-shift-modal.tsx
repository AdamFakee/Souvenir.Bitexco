import { Button, Chip, ModalBase, Shimmer } from '@/shared/components/ui'
import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useMachine } from '@xstate/react'
import { AlertTriangle, History, RefreshCw, WifiOff } from 'lucide-react-native'
import React, { useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

import { closeShiftMachine } from '../machines/close-shift.machine'
import { closeShiftSchema, type CloseShiftInput } from '../validations/close-shift.validation'

export interface CloseShiftModalRef {
  open: () => void
  close: () => void
}

interface CloseShiftModalProps {
  shiftId?: string
  ref?: React.Ref<CloseShiftModalRef>
}

const DISCREPANCY_REASONS = [
  'Thối nhầm tiền',
  'Thu thiếu tiền',
  'Chi tiền mặt chưa ghi',
  'Nhập sai hóa đơn',
  'Bàn giao thiếu',
  'Hoàn tiền cho khách',
  'Khác',
]

export const CloseShiftModal = ({ shiftId, ref }: CloseShiftModalProps) => {
  const [visible, setVisible] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)

  // Khởi tạo XState Machine
  const [state, send] = useMachine(closeShiftMachine, {
    input: {
      shiftId: shiftId || '',
      printRef: { current: null },
    },
  })

  // Giải nén context từ XState
  const { expectedEndingCash, unsyncedCount } = state.context

  // Phản ánh trạng thái máy trạng thái
  const isChecking = state.matches('checkingSyncStatus')
  const isOffline = state.matches('offlineError')
  const isUnsynced = state.matches('unsyncedWarning')
  const isSyncing = state.matches('syncing')
  const isReady = state.matches('readyToClose')
  const isClosing = state.matches('closing')

  const { control, handleSubmit, watch, reset, setValue } = useForm<CloseShiftInput>({
    resolver: valibotResolver(closeShiftSchema),
    defaultValues: {
      actualEndingCash: '',
      discrepancyReason: '',
    },
  })

  const actualValue = watch('actualEndingCash')
  const actualEndingCashNum = Number(actualValue) || 0
  const isDiscrepancy = actualEndingCashNum !== expectedEndingCash
  const currentReason = watch('discrepancyReason')

  // Phản hồi reactive từ Form sang XState Machine Context
  React.useEffect(() => {
    send({ type: 'SET_ACTUAL_CASH', amount: actualEndingCashNum })
  }, [actualEndingCashNum, send])

  React.useEffect(() => {
    send({ type: 'SET_DISCREPANCY_REASON', reason: currentReason || '' })
  }, [currentReason, send])

  // Đóng modal khi máy trạng thái hoàn tất thành công chốt ca
  React.useEffect(() => {
    if (state.matches('success')) {
      const timer = setTimeout(() => {
        setVisible(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state.value])

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!shiftId) return
      setVisible(true)
      setShowManualInput(false)
      reset({
        actualEndingCash: '',
        discrepancyReason: '',
      })
      send({ type: 'START' })
    },
    close: () => {
      setVisible(false)
      send({ type: 'CANCEL' })
    },
  }))

  const onConfirmClose = () => {
    if (!shiftId) return
    toast.confirm({
      title: 'Xác nhận kết thúc ca',
      message: 'Bạn có chắc chắn muốn kết thúc ca làm việc này?',
      onConfirm: () => {
        send({ type: 'SUBMIT' })
      },
    })
  }

  // Khóa nút chốt ca khi có lỗi, đang đóng hoặc đang tải dữ liệu
  const isCloseDisabled =
    !isReady || isOffline || isUnsynced || isClosing || isChecking || isSyncing

  if (!shiftId) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => {
        if (isClosing) return
        setVisible(false)
        send({ type: 'CANCEL' })
      }}
      dismissible={!isClosing}
      className="max-w-[640px] overflow-hidden rounded-[28px] bg-surface-50"
    >
      <View className="bg-surface-50 px-6 pb-5 pt-5">
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bottomOffset={32}>
          <View className="overflow-hidden rounded-[32px] border border-surface-200 bg-white px-6 py-6 shadow-sm">
            <View className="items-center justify-center px-4 py-4">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <History size={48} color={COLORS.primary.default} />
              </View>
              <Text className="mt-4 text-center text-2xl font-black text-surface-on">
                Kết thúc ca
              </Text>
              <Text className="mt-2 max-w-[420px] text-center text-base leading-6 text-neutral-600">
                Kiểm đếm tiền mặt tại quầy trước khi kết ca.
              </Text>
            </View>

            {isOffline && (
              <View className="mt-4 flex-row items-center gap-3 rounded-[20px] border border-error/20 bg-error-container/20 p-4">
                <WifiOff size={24} color={COLORS.error.default} />
                <View className="flex-1">
                  <Text className="text-lg font-black text-error">Thiết bị đang ngoại tuyến</Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-600">
                    Vui lòng kiểm tra Wifi trước khi kết ca.
                  </Text>
                </View>
                <Button
                  label="Thử lại"
                  variant="primary"
                  className="h-12 rounded-[16px] border-error bg-error px-5"
                  textClassName="text-white text-base font-bold"
                  onPress={() => send({ type: 'RETRY' })}
                />
              </View>
            )}

            {(isUnsynced || isSyncing) && (
              <View className="mt-4 flex-row items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle size={24} color="#D97706" />
                <View className="flex-1">
                  <Text className="text-lg font-black text-amber-800">
                    Còn {unsyncedCount} đơn chưa đồng bộ
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-amber-700">
                    Đồng bộ đơn hàng trước khi kết ca.
                  </Text>
                </View>
                <Button
                  label="Đồng bộ"
                  variant="primary"
                  loading={isSyncing}
                  leftIcon={RefreshCw}
                  className="h-12 rounded-[16px] border-amber-600 bg-amber-600 px-5"
                  textClassName="text-white text-base font-bold"
                  onPress={() => send({ type: 'SYNC' })}
                />
              </View>
            )}

            {(isChecking || isClosing) && (
              <View className="mt-4 gap-3 rounded-[20px] border border-outline-variant bg-surface-50 p-4">
                <Text className="text-lg font-black text-surface-on">
                  {isChecking ? 'Đang kiểm tra số liệu chốt ca...' : 'Đang đóng ca.'}
                </Text>
                <Shimmer className="h-10 w-full rounded-xl" />
                <Shimmer className="h-10 w-3/4 rounded-xl" />
              </View>
            )}

            {isReady && (
              <View className="mt-4">
                <Text className="mb-3 text-lg font-black text-surface-on">Số dư thực tế</Text>
                <View className="relative">
                  <ControlledInput
                    control={control}
                    name="actualEndingCash"
                    keyboardType="numeric"
                    className="h-20 rounded-[18px] border-2 border-outline-variant bg-white px-6 text-[40px] font-black text-surface-on"
                    placeholder="0"
                    formatValue={(val) => {
                      if (!val) return ''
                      return formatCurrency(Number(val.toString().replace(/\D/g, '')), {
                        showSymbol: false,
                      })
                    }}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/\D/g, '')
                      setValue('actualEndingCash', numericValue as any, {
                        shouldValidate: true,
                      })
                    }}
                  />
                  <View className="absolute right-6 top-[24%]">
                    <Text className="text-3xl font-black text-muted/30">đ</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View className="mx-auto mt-4 w-full rounded-[24px] border border-surface-200 bg-white px-6 py-5 shadow-sm">
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-lg font-semibold text-neutral-600">Tiền mặt dự kiến</Text>
              {isChecking ? (
                <Shimmer className="h-7 w-40 rounded-xl" />
              ) : (
                <Text className="text-xl font-black text-primary" numberOfLines={1}>
                  {formatCurrency(expectedEndingCash)}
                </Text>
              )}
            </View>

            {isReady && (
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-lg font-semibold text-neutral-600">Thực tế kiểm đếm</Text>
                <Text className="text-xl font-black text-neutral-900" numberOfLines={1}>
                  {formatCurrency(actualEndingCashNum)}
                </Text>
              </View>
            )}

            {isDiscrepancy && (isReady || isClosing) && (
              <View className="mt-2 border-t border-surface-200 pt-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-neutral-900">Chênh lệch</Text>
                  <Text
                    className={`text-[30px] font-black tracking-[-0.5px] ${actualEndingCashNum > expectedEndingCash ? 'text-success' : 'text-error'}`}
                  >
                    {actualEndingCashNum > expectedEndingCash ? '+' : ''}
                    {formatCurrency(actualEndingCashNum - expectedEndingCash)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {(isDiscrepancy || isReady === false) && (
            <View className="mx-auto mt-4 w-full rounded-[24px] border border-surface-200 bg-white px-6 py-5 shadow-sm">
              <Text className="text-lg font-black text-surface-on">Lý do chênh lệch</Text>
              <View className="mt-4 flex-row flex-wrap gap-3">
                {DISCREPANCY_REASONS.map((reason) => {
                  const isActive =
                    (reason === 'Khác' && showManualInput) ||
                    (!showManualInput && currentReason === reason)
                  return (
                    <Chip
                      key={reason}
                      label={reason}
                      active={isActive}
                      onPress={() => {
                        if (!isReady) return
                        if (reason === 'Khác') {
                          setShowManualInput(true)
                          setValue('discrepancyReason', '')
                        } else {
                          setShowManualInput(false)
                          setValue('discrepancyReason', reason)
                        }
                      }}
                      disabled={!isReady}
                      className="self-start px-4 py-2"
                      textClassName="text-base font-black"
                    />
                  )
                })}
              </View>

              {showManualInput && (
                <ControlledInput
                  control={control}
                  name="discrepancyReason"
                  placeholder="Nhập ghi chú lý do chi tiết..."
                  multiline
                  numberOfLines={2}
                  required
                  editable={isReady}
                  className="mt-4 rounded-[18px] border border-outline-variant bg-white text-lg font-bold text-surface-on"
                  textAlignVertical="top"
                />
              )}
            </View>
          )}
        </KeyboardAwareScrollView>

        <View className="mx-auto mt-4 w-full flex-row gap-3">
          <Button
            label="Hủy bỏ"
            variant="outline"
            className="h-14 flex-1 rounded-[16px] border-surface-200 bg-white"
            textClassName="text-base font-semibold text-neutral-500"
            onPress={() => {
              setVisible(false)
              send({ type: 'CANCEL' })
            }}
            disabled={isClosing}
          />
          <Button
            label="Xác nhận đóng ca"
            variant="error"
            className="h-14 flex-1 rounded-[16px]"
            textClassName="text-base font-semibold"
            loading={isClosing}
            disabled={isCloseDisabled}
            onPress={handleSubmit(onConfirmClose)}
          />
        </View>
      </View>
    </ModalBase>
  )
}
