import { Control, FieldValues, Path, useController } from 'react-hook-form'
import { Text, View } from 'react-native'
import { cn } from '@/shared/utils'
import { Input, type InputProps } from './input'
import { InputError } from './input-error'

interface ControlledInputProps<T extends FieldValues> extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> {
  control: Control<T, any, any>
  name: Path<T>
  label?: string
  required?: boolean
  error?: string
  containerClassName?: string
  formatValue?: (value: any) => string
  onChangeText?: (text: string) => void
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  className,
  label,
  required,
  error: customError,
  containerClassName,
  formatValue,
  onChangeText: customOnChangeText,
  ...inputProps
}: ControlledInputProps<T>) {
  const {
    field: { onChange, onBlur, value },
    fieldState: { error: formError },
  } = useController({
    control,
    name,
  })

  const errorMessage = customError || formError?.message

  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="text-on-surface mb-2 text-body-base font-semibold">
          {label}
          {required && <Text className="text-error"> *</Text>}
        </Text>
      )}
      <Input
        value={formatValue ? formatValue(value) : value}
        onBlur={onBlur}
        onChangeText={(text) => {
          if (customOnChangeText) {
            customOnChangeText(text)
          } else {
            onChange(text)
          }
        }}
        error={!!errorMessage}
        autoCapitalize="none"
        className={className}
        {...inputProps}
      />

      {errorMessage && <InputError message={errorMessage} />}
    </View>
  )
}
