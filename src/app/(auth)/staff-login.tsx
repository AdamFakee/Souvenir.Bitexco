import { Button, ControlledInput } from '@/shared/components/ui'
import { LogoSkystore } from '@/shared/components/ui/icons'
import { useAppStore } from '@/shared/features/app'
import { AuthAPI, BG_MAIN } from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { ArrowRight, Lock, User } from 'lucide-react-native'
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

      const response = await AuthAPI.login({
        deviceId,
        employeeCode: data.employeeCode,
        pin: data.pin,
      })

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
        <LogoSkystore width={300} height={120} color="#ffffff" />

        {/* Glassmorphic Form Wrapper */}
        <View style={styles.formWrapper}>
          {/* Card header */}
          <Text style={styles.title}>Chào mừng trở lại</Text>

          {/* Form fields */}
          <View style={styles.formGroup}>
            {/* Account field */}
            <ControlledInput
              control={control}
              name="employeeCode"
              label="Tài khoản"
              placeholder="Nhập tên tài khoản"
              leftIcon={User}
              iconColor="rgba(255, 255, 255, 0.6)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              containerClassName="mb-0"
              className="border-0 bg-transparent text-white"
              containerStyle={styles.inputContainer}
              focusedContainerStyle={styles.inputFocusedBorder}
              labelClassName="text-white font-medium"
              style={styles.textInput}
            />

            {/* Password field */}
            <ControlledInput
              control={control}
              name="pin"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              secureTextEntry
              leftIcon={Lock}
              iconColor="rgba(255, 255, 255, 0.6)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              containerClassName="mb-0"
              className="border-0 bg-transparent text-white"
              containerStyle={styles.inputContainer}
              focusedContainerStyle={styles.inputFocusedBorder}
              labelClassName="text-white font-medium"
              style={styles.textInput}
            />
          </View>

          {/* Login option card button */}
          <Button
            label="Đăng nhập ngay"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            rightIcon={ArrowRight}
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
    gap: 40,
    paddingTop: 24,
  },
  formWrapper: {
    width: 608,
    gap: 24,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 48,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  formGroup: {
    gap: 20,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 60,
    paddingHorizontal: 16,
  },
  inputFocusedBorder: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 16,
    color: '#ffffff',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
  },
  footerText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
})
