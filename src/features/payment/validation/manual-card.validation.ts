import * as v from 'valibot'

export const manualCardDetailsSchema = v.object({
  terminalId: v.optional(v.string()),
  merchantId: v.optional(v.string()),
  referenceNumber: v.optional(v.string()),
  approvalCode: v.optional(v.string()),
})

export type ManualCardDetailsFormData = v.InferOutput<typeof manualCardDetailsSchema>
