import { Button, ControlledInput } from '@/shared/components/ui'
import { useAppStore } from '@/shared/features/app'
import { AuthAPI, DeviceActivationFormData, deviceActivationSchema } from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

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
      // Gọi API POST /v1/pos-devices/activate
      console.log('[DeviceActivation] Calling real API /v1/pos-devices/activate', {
        deviceCode: data.deviceCode,
        activationToken: data.activationToken,
      })

      const response = await AuthAPI.activateDevice({
        deviceCode: data.deviceCode,
        activationToken: data.activationToken,
      })

      console.log('[DeviceActivation] API response:', response)

      // activateDevice trả về DeviceInfo trực tiếp (API v1.8 — không có wrapper)
      // Nếu không throw thì là thành công
      appService?.send({
        type: 'DEVICE_ACTIVATED',
        device: response,
      })
      toast.success('Kích hoạt thiết bị thành công')
      // Navigation tự động qua useAppGate
    } catch (error: any) {
      console.error('Activation error:', error)
      console.error(
        'Activation error response data:',
        JSON.stringify(error.response?.data, null, 2),
      )

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
    <View className="flex-1 flex-row bg-surface">
      {/* Left Side - Branding */}
      <LinearGradient
        colors={['#e0f2fe', '#bae6fd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-[3] justify-center p-12"
      >
        <View>
          <Text className="text-5xl font-black leading-tight tracking-tighter text-primary">
            SOUVENIR{'\n'}BITEXCO
          </Text>
          <Text className="mt-4 text-lg text-surface-on-variant">
            Hệ thống quản lý bán hàng chuyên nghiệp
          </Text>
        </View>
      </LinearGradient>

      {/* Right Side - Activation Form */}
      <View className="flex-[7] items-center justify-center px-16">
        <View className="w-full max-w-[460px]">
          <Text className="text-3xl font-bold text-surface-on">Kích hoạt thiết bị</Text>
          <Text className="mt-2 text-base text-surface-on-variant">
            Vui lòng nhập mã kích hoạt do quản trị viên cấp để sử dụng máy POS này.
          </Text>

          <View className="mt-8">
            <ControlledInput
              control={control}
              name="deviceCode"
              label="Mã thiết bị"
              placeholder="Ví dụ: POS-001"
              required
            />
            <ControlledInput
              control={control}
              name="activationToken"
              label="Mã kích hoạt"
              placeholder="Nhập mã 6 chữ số"
              required
            />
            <Button
              label="Kích hoạt"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              className="mt-4"
            />
          </View>
        </View>
      </View>
    </View>
  )
}
