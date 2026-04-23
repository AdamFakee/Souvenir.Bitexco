import { Control, FieldValues, Path, useController } from 'react-hook-form'
import { Text, View } from 'react-native'
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
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  className,
  label,
  required,
  error: customError,
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
    <View className="mb-4">
      {label && (
        <Text className="font-note-1 mb-2 text-black">
          {label}
          {required && <Text className="text-primary"> *</Text>}
        </Text>
      )}
      <Input
        value={value}
        onBlur={onBlur}
        onChangeText={onChange}
        error={!!errorMessage}
        autoCapitalize="none"
        className={className}
        {...inputProps}
      />

      {errorMessage && <InputError message={errorMessage} />}
    </View>
  )
}
