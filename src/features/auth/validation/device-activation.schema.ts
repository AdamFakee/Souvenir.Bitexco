import { InferOutput, minLength, object, pipe, string } from 'valibot'

export const deviceActivationSchema = object({
  deviceCode: pipe(string(), minLength(1, 'Mã thiết bị là bắt buộc')),
  activationToken: pipe(string(), minLength(6, 'Mã kích hoạt phải có ít nhất 6 ký tự')),
})

export type DeviceActivationFormData = InferOutput<typeof deviceActivationSchema>
