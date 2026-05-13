import { Button, Chip, ModalBase } from '@/shared/components/ui'
import { toast } from '@/shared/store'

import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS } from '@/shared/constants'
import { ShiftModel } from '@/shared/lib'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { History, X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import {
  InferInput,
  InferOutput,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from 'valibot'
import { useCloseStaffShift } from '../hooks'

const closeShiftSchema = object({
  actualEndingCash: pipe(
    union([string(), number()]),
    transform((v) => Number(v) || 0),
    number(),
    minValue(0, 'Số tiền không được âm'),
  ),
  discrepancyReason: optional(string()),
})

type CloseShiftInput = InferInput<typeof closeShiftSchema>
type CloseShiftOutput = InferOutput<typeof closeShiftSchema>

export interface CloseShiftModalRef {
  open: () => void
  close: () => void
}

interface CloseShiftModalProps {
  shift: ShiftModel
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

export const CloseShiftModal = ({ shift, ref }: CloseShiftModalProps) => {
  const [visible, setVisible] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
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
    open: () => {
      setVisible(true)
      setShowManualInput(false)
      reset({
        actualEndingCash: '',
        discrepancyReason: '',
      })
    },
    close: () => setVisible(false),
  }))

  const actualValue = watch('actualEndingCash')
  const actualEndingCashNum = Number(actualValue) || 0
  const expectedEndingCash = shift?.expectedEndingCash ?? 0
  const isDiscrepancy = actualEndingCashNum !== expectedEndingCash
  const currentReason = watch('discrepancyReason')

  const onConfirmClose = async (values: CloseShiftInput) => {
    toast.confirm({
      title: 'Xác nhận đóng ca',
      message: 'Bạn có chắc chắn muốn kết thúc ca làm việc không?',
      onConfirm: async () => {
        const data = values as unknown as CloseShiftOutput
        const success = await closeStaffShift(shift, {
          actualEndingCash: data.actualEndingCash,
          discrepancyReason: data.discrepancyReason,
        })
        if (success) {
          setVisible(false)
        }
      },
    })
  }

  if (!shift) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="mx-auto w-[850px] rounded-[48px] bg-white shadow-2xl"
    >
      <View className="p-12">
        {/* Header */}
        <View className="mb-10 flex-row items-center justify-between border-b-2 border-outline-variant pb-8">
          <View className="flex-row items-center gap-6">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
              <History size={48} color={COLORS.primary.default} />
            </View>
            <Text className="text-5xl font-black tracking-tight text-surface-on">Kết thúc ca</Text>
          </View>
          <Pressable onPress={() => setVisible(false)} className="rounded-full bg-surface-100 p-5">
            <X size={40} color={COLORS.surface.onVariant} />
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: screenHeight * 0.75 }}
          bottomOffset={20}
        >
          {/* Thông tin ca */}
          <View className="mb-12 space-y-8 rounded-[32px] bg-surface-100 p-10">
            <Row label="Tiền mặt đầu ca" value={formatCurrency(shift.startingCash)} />
            <Row label="Doanh thu tiền mặt" value={formatCurrency(shift.cashRevenue)} />
            <Row label="Doanh thu QRCode" value={formatCurrency(shift.qrRevenue)} />
            <View className="mt-8 flex-row items-center justify-between border-t-2 border-dashed border-outline-variant pt-10">
              <Text className="text-3xl font-black uppercase tracking-widest text-primary">
                Tiền mặt dự kiến:
              </Text>
              <Text className="text-6xl font-black text-primary">
                {formatCurrency(shift.expectedEndingCash)}
              </Text>
            </View>
          </View>

          {/* Nhập tiền thực tế */}
          <View className="mb-12">
            <Text className="mb-6 text-3xl font-black text-surface-on">
              Số dư tiền mặt thực tế kiểm đếm:
            </Text>
            <View className="relative">
              <ControlledInput
                control={control}
                name="actualEndingCash"
                keyboardType="numeric"
                className="h-24 rounded-[32px] px-10 pr-20 text-4xl font-black"
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
              <View className="absolute right-[6%] top-[30%]">
                <Text className="text-4xl font-black text-surface-on-variant">đ</Text>
              </View>
            </View>
          </View>

          {/* Chênh lệch */}
          {isDiscrepancy && (
            <View className="mb-12 border-t-2 border-outline-variant pt-10">
              <View className="mb-8 flex-row items-center justify-between">
                <Text className="text-3xl font-black uppercase text-surface-on-variant">
                  Chênh lệch:
                </Text>
                <Text
                  className={`text-5xl font-black ${actualEndingCashNum > expectedEndingCash ? 'text-success' : 'text-error'}`}
                >
                  {formatCurrency(actualEndingCashNum - expectedEndingCash)}
                </Text>
              </View>

              <Text className="mb-6 text-2xl font-bold uppercase text-surface-on-variant">
                Chọn lý do chênh lệch:
              </Text>

              <View className="mb-10 flex-row flex-wrap gap-5">
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
                      className="h-22 px-10 py-6"
                    />
                  )
                })}
              </View>

              {showManualInput && (
                <ControlledInput
                  control={control}
                  name="discrepancyReason"
                  placeholder="Ghi chú lý do cụ thể..."
                  multiline
                  numberOfLines={3}
                  required
                  className="rounded-3xl border border-outline-variant bg-surface-50 p-8 text-2xl"
                />
              )}
            </View>
          )}

          {/* Button */}
          <View className="mb-12 flex-row gap-8">
            <Button
              label="Quay lại"
              variant="outline"
              className="h-24 flex-1 rounded-[32px] border-2"
              textClassName="text-3xl font-bold"
              onPress={() => setVisible(false)}
            />
            <Button
              label="XÁC NHẬN ĐÓNG CA"
              variant="error"
              className="h-24 flex-1 rounded-[32px]"
              textClassName="font-black text-3xl"
              loading={isClosing}
              onPress={handleSubmit(onConfirmClose)}
            />
          </View>
        </KeyboardAwareScrollView>
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
