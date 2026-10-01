import { useAppStore } from '@/features/app'
import { activateDevice, DeviceActivationFormData, deviceActivationSchema } from '@/features/auth'
import { Button, ControlledInput } from '@/shared/components/ui'
import { LogoSkystore } from '@/shared/components/ui/icons'
import { IMAGES } from '@/shared/constants'
import { toast } from '@/shared/store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { ArrowRight, Key, Smartphone } from 'lucide-react-native'
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
      const response = await activateDevice({
        deviceCode: data.deviceCode,
        activationToken: data.activationToken,
      })

      // activateDevice trả về DeviceInfo trực tiếp (API v1.8 — không có wrapper)
      // Nếu không throw thì là thành công
      appService?.send({
        type: 'DEVICE_ACTIVATED',
        device: response,
      })
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
    <ImageBackground source={IMAGES.BG_MAIN} style={styles.bg} resizeMode="cover">
      {/* Teal gradient overlay matching Figma */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Logo top */}
        <LogoSkystore width={300} height={120} color="#ffffff" />

        {/* Glassmorphic Form Wrapper */}
        <View style={styles.formWrapper}>
          {/* Card header */}
          <Text style={styles.title}>Kích hoạt thiết bị</Text>

          {/* Form fields */}
          <View style={styles.formGroup}>
            <ControlledInput
              control={control}
              name="deviceCode"
              label="Mã thiết bị"
              placeholder="Ví dụ: POS-001"
              leftIcon={Smartphone}
              iconColor="rgba(255, 255, 255, 0.6)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              containerClassName="mb-0"
              className="border-0 bg-transparent text-white"
              containerStyle={styles.inputContainer}
              focusedContainerStyle={styles.inputFocusedBorder}
              labelClassName="text-white text-xl font-bold mb-2.5"
              style={styles.textInput}
              iconSize={26}
            />
            <ControlledInput
              control={control}
              name="activationToken"
              label="Mã kích hoạt"
              placeholder="Nhập mã kích hoạt"
              leftIcon={Key}
              iconColor="rgba(255, 255, 255, 0.6)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              containerClassName="mb-0"
              className="border-0 bg-transparent text-white"
              containerStyle={styles.inputContainer}
              focusedContainerStyle={styles.inputFocusedBorder}
              labelClassName="text-white text-xl font-bold mb-2.5"
              style={styles.textInput}
              iconSize={26}
            />
          </View>

          {/* Activate option card button */}
          <Button
            label="Kích hoạt ngay"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            rightIcon={ArrowRight}
            className="h-20 rounded-[16px]"
            textClassName="text-2xl font-black"
            iconSize={26}
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
    fontSize: 54,
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
    borderRadius: 16,
    height: 80,
    paddingHorizontal: 20,
  },
  inputFocusedBorder: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 22,
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
