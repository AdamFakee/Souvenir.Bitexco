import { Button, ControlledInput } from '@/shared/components/ui'
import { useAppStore } from '@/shared/features/app'
import { EmployeePermission, EmployeeRole } from '@/shared/features/app/types/app.types'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import * as v from 'valibot'
import { AuthAPI } from '@/shared/features/auth'

const loginSchema = v.object({
  employeeCode: v.pipe(v.string(), v.minLength(1, 'Mã nhân viên là bắt buộc')),
  pin: v.pipe(v.string(), v.length(4, 'PIN phải có đúng 4 chữ số')),
})

type LoginFormData = v.InferOutput<typeof loginSchema>

export default function StaffLogin() {
  const [loading, setLoading] = useState(false)
  const appService = useAppStore((s) => s.appService)

  const { control, handleSubmit, setError } = useForm<LoginFormData>({
    resolver: valibotResolver(loginSchema),
    defaultValues: {
      employeeCode: '',
      pin: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      // Lấy deviceId từ machine context
      const deviceId = appService?.getSnapshot().context.device?.id
      if (!deviceId) {
        toast.error('Thiết bị chưa được kích hoạt')
        return
      }

      // Gọi API POST /v1/device/auth/login
      console.log('[StaffLogin] Calling API login with', {
        deviceId,
        employeeCode: data.employeeCode,
        pin: data.pin,
      })

      const response = await AuthAPI.login({
        deviceId,
        employeeCode: data.employeeCode,
        pin: data.pin,
      })

      console.log('[StaffLogin] API response:', response)

      // response ở đây đã là LoginResponseData trực tiếp (API v1.8)
      appService?.send({
        type: 'LOGIN_SUCCESS',
        accessToken: response.accessToken,
        employee: response.employee,
        device: appService.getSnapshot().context.device!,
      })
      toast.success('Đăng nhập thành công')
      // Navigation tự động qua useAppGate
    } catch (error: any) {
      console.error('Login error:', error)

      const serverData = error.response?.data
      // API v1.8 format: { "error": "auth.employee_not_found" } hoặc tương tự
      const message =
        serverData?.message ||
        (typeof serverData?.error === 'string' ? serverData.error : null) ||
        error.message ||
        'Mã nhân viên hoặc PIN không đúng'

      setError('pin', { type: 'manual', message })
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

      {/* Right Side - Login Form */}
      <View className="flex-[7] items-center justify-center px-16">
        <View className="w-full max-w-[460px]">
          <Text className="text-3xl font-bold text-surface-on">Đăng nhập nhân viên</Text>
          <Text className="mt-2 text-base text-surface-on-variant">
            Nhập mã nhân viên và mã PIN để bắt đầu ca làm việc
          </Text>

          <View className="mt-8">
            <ControlledInput
              control={control}
              name="employeeCode"
              label="Mã nhân viên"
              placeholder="Ví dụ: NV001"
              required
            />
            <ControlledInput
              control={control}
              name="pin"
              label="Mã PIN"
              placeholder="••••"
              secureTextEntry
              required
            />
            <Button
              label="Đăng nhập"
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
