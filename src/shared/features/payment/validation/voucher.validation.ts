import * as v from 'valibot'

export const VoucherSchema = v.object({
  code: v.optional(v.string()),
})

export type VoucherFormValues = v.InferInput<typeof VoucherSchema>
