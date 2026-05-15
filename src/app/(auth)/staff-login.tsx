import { Button, ControlledInput } from '@/shared/components/ui'
import { ROUTES } from '@/shared/constants'
import { LoginFormData, loginSchema, StaffRemoteAPI, useAuthStore } from '@/shared/features/auth'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

export default function StaffLogin() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const { authenticate } = useAuthStore()

  const { control, handleSubmit, setError } = useForm<LoginFormData>({
    resolver: valibotResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      // Gọi API Login Remote
      const response = await StaffRemoteAPI.login({
        username: data.username,
        password: data.password,
      })

      if (response.success && response.data) {
        const { staff, tokens, currentShiftId } = response.data

        // Lưu thông tin vào Zustand Store
        authenticate(
          {
            staffId: staff.id,
            shiftId: currentShiftId || '', // Nếu chưa có ca thì để trống
            loginAt: Date.now(),
          },
          staff,
          tokens,
        )

        toast.success('Đăng nhập thành công')

        // Nếu đã có ca thì vào thẳng Tab chính, ngược lại vào màn mở ca
        if (currentShiftId) {
          router.replace(ROUTES.POS.path())
        } else {
          router.replace(ROUTES.OPEN_SHIFT.path())
        }
      } else {
        // Hiển thị lỗi từ Backend trả về
        const errorMessage = response.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
        setError('username', { type: 'manual', message: errorMessage })
        setError('password', { type: 'manual', message: errorMessage })
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Đã có lỗi xảy ra trong quá trình đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  const handlePinLogin = () => {
    toast.info(
      'Tính năng đang được phát triển và sẽ sớm ra mắt trong các phiên bản tới.',
      'Tính năng sắp ra mắt',
    )
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
          <Text className="text-3xl font-bold text-surface-on">Đăng nhập hệ thống</Text>
          <Text className="mt-2 text-base text-surface-on-variant">
            Vui lòng nhập thông tin hoặc mã PIN
          </Text>

          <View className="mt-8">
            <ControlledInput
              control={control}
              name="username"
              label="Tên đăng nhập"
              placeholder="Tài khoản"
              required
            />

            <ControlledInput
              control={control}
              name="password"
              label="Mật khẩu"
              placeholder="••••••••"
              secureTextEntry
              required
            />

            <Button
              label="Đăng nhập"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              className="mt-4"
            />

            <View className="my-4 flex-row items-center gap-4">
              <View className="h-[1px] flex-1 bg-outline-variant" />
              <Text className="text-xs text-surface-on-variant">hoặc</Text>
              <View className="h-[1px] flex-1 bg-outline-variant" />
            </View>

            <Button label="Đăng nhập bằng mã PIN" variant="outline" onPress={handlePinLogin} />
          </View>
        </View>
      </View>
    </View>
  )
}
