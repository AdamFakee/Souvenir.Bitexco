import * as v from 'valibot'

export const refundFormSchema = v.object({
  reason: v.pipe(
    v.string('Lý do hủy đơn không hợp lệ'),
    v.trim(),
    v.minLength(1, 'Vui lòng chọn hoặc nhập lý do hủy đơn'),
  ),
})

export type RefundFormData = v.InferOutput<typeof refundFormSchema>
