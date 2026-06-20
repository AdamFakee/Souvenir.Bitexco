import { Button, ControlledInput } from '@/shared/components/ui'
import { LogoSkystore } from '@/shared/components/ui/icons'
import { useAppStore } from '@/shared/features/app'
import {
  AuthAPI,
  BG_MAIN,
  DeviceActivationFormData,
  deviceActivationSchema,
} from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { ArrowRight } from 'lucide-react-native'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'

export default function DeviceActivation() {
  const [loading, setLoading] = useState(false)
  const appService = useAppStore((s) => s.appService)

  const { control, handleSubmit, setError } = useForm<DeviceActivationFormData>({
    resolver: valibotResolver(deviceActivationSchema),
    defaultValues: {
      deviceCode: '',
      activationToken: '',
    },
  })

  const onSubmit = async (data: DeviceActivationFormData) => {
    setLoading(true)
    try {
      const response = await AuthAPI.activateDevice({
        deviceCode: data.deviceCode,
        activationToken: data.activationToken,
      })

      // activateDevice trả về DeviceInfo trực tiếp (API v1.8 — không có wrapper)
      // Nếu không throw thì là thành công
      appService?.send({
        type: 'DEVICE_ACTIVATED',
        device: response,
      })
      toast.success('Kích hoạt thiết bị thành công')
      // Navigation tự động qua useAppGate
    } catch (error: any) {
      const serverData = error.response?.data
      // API v1.8: error code dạng { "error": "pos.device_not_found" }
      const message =
        serverData?.message ||
        (typeof serverData?.error === 'string' ? serverData.error : null) ||
        error.message ||
        'Đã có lỗi xảy ra trong quá trình kích hoạt'

      setError('activationToken', { type: 'manual', message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      {/* Teal gradient overlay matching Figma */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Logo top */}
        <LogoSkystore width={200} height={80} color="#ffffff" />

        {/* White card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Kích hoạt thiết bị</Text>
          </View>

          {/* Form fields */}
          <View style={styles.formGroup}>
            <ControlledInput
              control={control}
              name="deviceCode"
              label="Mã thiết bị"
              placeholder="Ví dụ: POS-001"
            />
            <ControlledInput
              control={control}
              name="activationToken"
              label="Mã kích hoạt"
              placeholder="Nhập mã kích hoạt"
            />
          </View>

          {/* Activate option card button */}
          <Button
            label="Kích hoạt ngay"
            variant="outline"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            rightIcon={ArrowRight}
            textClassName="text-[#111827] font-bold text-[20px]"
          />
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingTop: 24,
  },
  card: {
    width: 608,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    // borderWidth: 1,
    // borderColor: '#e0e1e2',
    padding: 24,
    gap: 24,
    shadowColor: '#a8a8a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 32,
    lineHeight: 44.8,
    color: '#282929',
  },
  formGroup: {
    gap: 16,
  },
})
