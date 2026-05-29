import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { TextInput, TextInputProps } from 'react-native'

export interface InputProps extends TextInputProps {
  className?: string
  error?: boolean
}

export const Input = ({ className, error, style, ...props }: InputProps) => {
  return (
    <TextInput
      className={cn(
        props.multiline ? 'min-h-[140px] py-4' : 'h-[60px]',
        'rounded-lg border bg-white px-4',
        error ? 'border-error bg-error-container' : 'border-outline focus:border-primary',
        className,
      )}
      placeholderTextColor="#8d8e8f"
      style={[
        {
          fontFamily: 'Manrope-Medium',
          fontSize: 15,
          color: '#0f0f0f',
        },
        style,
      ]}
      {...props}
    />
  )
}
