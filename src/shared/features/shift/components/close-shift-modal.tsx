import { Button, Chip, IconButton, ModalBase, Shimmer } from '@/shared/components/ui'
import { toast } from '@/shared/store'

import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS } from '@/shared/constants'

import {
  closeShiftSchema,
  ShiftRemoteAPI,
  useCloseStaffShift,
  type CloseShiftInput,
  type CloseShiftOutput,
} from '@/shared/features/shift'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { History, X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, useWindowDimensions, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

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
  const [expectedEndingCash, setExpectedEndingCash] = useState(0)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const { closeStaffShift, isLoading: isClosing } = useCloseStaffShift()
  const { height: screenHeight } = useWindowDimensions()

  const { control, handleSubmit, watch, reset, setValue } = useForm<CloseShiftInput>({
    resolver: valibotResolver(closeShiftSchema),
    defaultValues: {
      actualEndingCash: '',
      discrepancyReason: '',
    },
  })

  useImperativeHandle(ref, () => ({
    open: async () => {
      if (!shiftId) return

      setVisible(true)
      setShowManualInput(false)
      reset({
        actualEndingCash: '',
        discrepancyReason: '',
      })

      // Lấy thông tin thống kê từ Server
      setIsLoadingStats(true)
      try {
        const res = await ShiftRemoteAPI.getShiftStatistics(shiftId)
        setExpectedEndingCash(res.expectedEndingCash)
      } catch (error) {
        console.error('Error fetching shift stats:', error)
        toast.error('Không thể lấy thống kê ca làm việc từ máy chủ')
      } finally {
        setIsLoadingStats(false)
      }
    },
    close: () => setVisible(false),
  }))

  const actualValue = watch('actualEndingCash')
  const actualEndingCashNum = Number(actualValue) || 0
  const isDiscrepancy = actualEndingCashNum !== expectedEndingCash
  const currentReason = watch('discrepancyReason')

  const onConfirmClose = async (values: CloseShiftInput) => {
    if (!shiftId) return
    toast.confirm({
      title: 'Xác nhận đóng ca',
      message: 'Bạn có chắc chắn muốn kết thúc ca làm việc này không?',
      onConfirm: async () => {
        const data = values as unknown as CloseShiftOutput
        const success = await closeStaffShift(shiftId, {
          actualEndingCash: data.actualEndingCash,
          discrepancyReason: data.discrepancyReason,
        })
        if (success) {
          setVisible(false)
        }
      },
    })
  }

  if (!shiftId) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="mx-auto w-[1200px] rounded-[48px] bg-background shadow-2xl"
    >
      <View className="p-0">
        {/* Header - POS Style */}
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
          <View className="flex-row items-center gap-6">
            <History size={40} color={COLORS.primary.default} />
            <Text className="text-4xl font-black text-surface-on">Kết thúc ca</Text>
          </View>
          <IconButton
            icon={X}
            size={32}
            color={COLORS.surface.onVariant}
            onPress={() => setVisible(false)}
          />
        </View>

        <View className="flex-row" style={{ height: screenHeight * 0.75 }}>
          {/* Left Column: Summary (POS Sidebar Style) */}
          <View className="w-[480px] justify-between bg-white p-10">
            <View>
              <View className="gap-10">
                <View className="rounded-3xl border border-primary/10 bg-primary/5 p-8">
                  <Text className="mb-2 text-xl font-black uppercase tracking-widest text-primary/70">
                    Tiền mặt dự kiến
                  </Text>
                  {isLoadingStats ? (
                    <Shimmer className="h-16 w-full rounded-2xl" />
                  ) : (
                    <Text
                      className="text-6xl font-black tracking-tighter text-primary"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatCurrency(expectedEndingCash)}
                    </Text>
                  )}
                </View>

                {isDiscrepancy && (
                  <View className="rounded-3xl border border-error/10 bg-error-container/10 p-8">
                    <Text className="mb-2 text-xl font-black uppercase tracking-widest text-error">
                      Chênh lệch
                    </Text>
                    <Text
                      className={`text-6xl font-black ${actualEndingCashNum > expectedEndingCash ? 'text-success' : 'text-error'}`}
                    >
                      {actualEndingCashNum > expectedEndingCash ? '+' : ''}
                      {formatCurrency(actualEndingCashNum - expectedEndingCash)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="rounded-3xl border border-outline-variant/50 bg-surface-100 p-8">
              <Text className="text-xl font-bold italic leading-relaxed text-muted">
                * Vui lòng kiểm đếm chính xác số tiền mặt hiện có tại quầy để đảm bảo tính minh bạch
                của ca làm việc.
              </Text>
            </View>
          </View>

          {/* Right Column: Interaction (Main Content) */}
          <View className="flex-1 border-l border-outline-variant bg-surface-50 p-10">
            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bottomOffset={40}>
              <View className="gap-12">
                <View>
                  <Text className="mb-6 text-2xl font-black uppercase tracking-widest text-surface-on">
                    Nhập số dư thực tế kiểm đếm:
                  </Text>
                  <View className="relative">
                    <ControlledInput
                      control={control}
                      name="actualEndingCash"
                      keyboardType="numeric"
                      className="h-32 rounded-3xl border-2 border-outline-variant bg-white px-10 text-7xl font-black text-surface-on"
                      placeholder="0"
                      formatValue={(val) => {
                        if (!val) return ''
                        return formatCurrency(Number(val.toString().replace(/\D/g, '')), {
                          showSymbol: false,
                        })
                      }}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/\D/g, '')
                        setValue('actualEndingCash', numericValue as any, { shouldValidate: true })
                      }}
                    />
                    <View className="absolute right-10 top-[25%]">
                      <Text className="text-5xl font-black text-muted/30">đ</Text>
                    </View>
                  </View>
                </View>

                {isDiscrepancy && (
                  <View className="gap-6">
                    <Text className="text-2xl font-black uppercase tracking-widest text-surface-on">
                      Lý do chênh lệch:
                    </Text>
                    <View className="flex-row flex-wrap gap-4">
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
                              if (reason === 'Khác') {
                                setShowManualInput(true)
                                setValue('discrepancyReason', '')
                              } else {
                                setShowManualInput(false)
                                setValue('discrepancyReason', reason)
                              }
                            }}
                            className="h-18 self-start px-8 py-4"
                            textClassName="text-xl font-black"
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
                        className="rounded-3xl border border-outline-variant bg-white text-2xl font-bold text-surface-on"
                        textAlignVertical="top"
                      />
                    )}
                  </View>
                )}
              </View>
            </KeyboardAwareScrollView>

            {/* Buttons Grouped at Bottom */}
            <View className="mt-10 flex-row gap-6">
              <Button
                label="HỦY BỎ"
                variant="outline"
                className="h-24 flex-1 rounded-[32px] border-2"
                textClassName="text-2xl font-black"
                onPress={() => setVisible(false)}
              />
              <Button
                label="XÁC NHẬN ĐÓNG CA"
                variant="error"
                className="h-24 flex-1 rounded-[32px]"
                textClassName="text-2xl font-black"
                loading={isClosing}
                onPress={handleSubmit(onConfirmClose)}
              />
            </View>
          </View>
        </View>
      </View>
    </ModalBase>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-3xl font-medium text-surface-on-variant">{label}:</Text>
      <Text className="text-4xl font-black text-surface-on" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
