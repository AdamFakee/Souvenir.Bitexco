import { Button } from '../ui/button'
import { ControlledInput } from '../ui/form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import * as v from 'valibot'

export const managerApprovalSchema = v.object({
  employeeCode: v.pipe(v.string(), v.minLength(1, 'Mã quản lý là bắt buộc')),
  pin: v.pipe(v.string(), v.minLength(1, 'PIN là bắt buộc')),
})

export type ManagerApprovalFormData = v.InferOutput<typeof managerApprovalSchema>

export interface ManagerApprovalOverlayProps {
  visible: boolean
  message?: string | null
  isSubmitting?: boolean
  onCancel: () => void
  onSubmit: (data: ManagerApprovalFormData) => void
}

export const ManagerApprovalOverlay: React.FC<ManagerApprovalOverlayProps> = ({
  visible,
  message,
  isSubmitting = false,
  onCancel,
  onSubmit,
}) => {
  const { control, handleSubmit, reset } = useForm<ManagerApprovalFormData>({
    resolver: valibotResolver(managerApprovalSchema),
    defaultValues: { employeeCode: '', pin: '' },
  })

  useEffect(() => {
    if (visible) {
      reset({ employeeCode: '', pin: '' })
    }
  }, [visible, reset])

  if (!visible) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Cần duyệt quản lý</Text>
        <Text style={styles.subtitle}>
          {message || 'Nhập tài khoản và PIN quản lý để phê duyệt.'}
        </Text>

        <View style={styles.formGroup}>
          <ControlledInput
            control={control}
            name="employeeCode"
            label="Tài khoản quản lý"
            placeholder="Mã nhân viên quản lý"
            autoFocus
          />
          <ControlledInput
            control={control}
            name="pin"
            label="Mã PIN"
            placeholder="PIN / mật khẩu"
            secureTextEntry
          />
        </View>

        <View className="mt-1 flex-row gap-4">
          <Button
            label="Huỷ"
            variant="outline"
            onPress={onCancel}
            className="h-[68px] flex-1 rounded-xl"
            textClassName="text-[19px] font-bold"
            disabled={isSubmitting}
          />
          <Button
            label="Xác nhận"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            className="h-[68px] flex-1 rounded-xl"
            textClassName="text-[19px] font-bold"
            loading={isSubmitting}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 99,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 22,
  },
  formGroup: {
    gap: 16,
    marginBottom: 24,
  },
})
