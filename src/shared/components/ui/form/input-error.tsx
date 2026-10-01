import { cn } from '@/shared/utils'
import { Text } from 'react-native'

interface InputErrorProps {
  message: string
  className?: string
  style?: any
}

export const InputError = ({ message, className, style }: InputErrorProps) => {
  return (
    <Text className={cn('ml-1 mt-1 text-body-sm font-medium text-error', className)} style={style}>
      {message}
    </Text>
  )
}
