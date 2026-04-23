import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native'

interface LoadingIndicatorProps extends ActivityIndicatorProps {
  className?: string
}

export const LoadingIndicator = ({ className, color, ...props }: LoadingIndicatorProps) => {
  return <ActivityIndicator color={color ?? COLORS.primary} className={cn(className)} {...props} />
}
