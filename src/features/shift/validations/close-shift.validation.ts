import {
  InferInput,
  InferOutput,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from 'valibot'

export const closeShiftSchema = object({
  actualEndingCash: pipe(
    union([string(), number()]),
    transform((v) => Number(v) || 0),
    number(),
    minValue(0, 'Số tiền không được âm'),
  ),
  discrepancyReason: optional(string()),
})

export type CloseShiftInput = InferInput<typeof closeShiftSchema>
export type CloseShiftOutput = InferOutput<typeof closeShiftSchema>
