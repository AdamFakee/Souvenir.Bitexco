import { Button, ControlledInput } from '@/shared/components/ui'
import { LogoSkystore } from '@/shared/components/ui/icons'
import { useAppStore } from '@/shared/features/app'
import { AuthAPI, BG_MAIN } from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { ArrowRight } from 'lucide-react-native'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import * as v from 'valibot'

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

      console.log('[StaffLogin] API response:', { ...response, refreshToken: '***' })

      // Lưu refreshToken vào MMKV NGAY TRƯỚC khi dispatch — machine cần nó ở refreshAuthFlow
      useAppStore.getState().saveRefreshToken(response.refreshToken)

      // Dispatch LOGIN_SUCCESS — dùng response.device (fresh từ server)
      appService?.send({
        type: 'LOGIN_SUCCESS',
        accessToken: response.accessToken,
        employee: response.employee,
        device: response.device,
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
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>
          </View>

          {/* Form fields */}
          <View style={styles.formGroup}>
            <ControlledInput
              control={control}
              name="employeeCode"
              label="Tài khoản"
              placeholder="Nhập tên tài khoản"
            />
            <ControlledInput
              control={control}
              name="pin"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              secureTextEntry
            />
          </View>

          {/* Login option card button */}
          <Button
            label="Đăng nhập ngay"
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
