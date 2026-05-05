import { Button, ControlledInput } from '@/shared/components/ui'
import { ROUTES } from '@/shared/constants'
import {
  LoginFormData,
  loginSchema,
  Staff,
  StaffLocalAPI,
  useAuthStore,
} from '@/shared/features/auth'
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
  const { authenticate, setStaff } = useAuthStore()

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
      const staff = await StaffLocalAPI.login({
        username: data.username,
        password: data.password,
      })

      if (staff) {
        const plainStaff: Staff = {
          id: staff.id,
          username: staff.username,
          fullname: staff.fullname,
          role: staff.role,
          password: staff.password,
          isActive: staff.isActive,
          isDeleted: staff.isDeleted,
        }
        setStaff(plainStaff)
        router.push(ROUTES.OPEN_SHIFT.path())
        return
      } else {
        setError('username', {
          type: 'manual',
          message: 'Tên đăng nhập hoặc mật khẩu không đúng',
        })
        setError('password', {
          type: 'manual',
          message: 'Tên đăng nhập hoặc mật khẩu không đúng',
        })
      }
    } catch {
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
