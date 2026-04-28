import { InferOutput, minLength, object, pipe, string } from 'valibot'

export const loginSchema = object({
  username: pipe(string(), minLength(1, 'Tên đăng nhập là bắt buộc')),
  password: pipe(string(), minLength(1, 'Mật khẩu là bắt buộc')),
})

export type LoginFormData = InferOutput<typeof loginSchema>
