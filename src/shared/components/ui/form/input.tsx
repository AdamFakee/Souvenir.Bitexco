import { cn } from '@/shared/utils'
import { TextInput, TextInputProps } from 'react-native'

export interface InputProps extends TextInputProps {
  className?: string
  error?: boolean
}

export const Input = ({ className, error, ...props }: InputProps) => {
  return (
    <TextInput
      className={cn(
        'text-on-surface h-[56px] rounded-md border bg-surface-50 px-4 py-3 text-body-base',
        error ? 'border-error bg-error-container' : 'border-outline-variant focus:border-primary',
        className,
      )}
      placeholderClassName="text-on-surface-variant"
      {...props}
    />
  )
}
