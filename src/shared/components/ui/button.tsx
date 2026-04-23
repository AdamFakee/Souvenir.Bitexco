import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { LucideIcon } from 'lucide-react-native'
import { Pressable, PressableProps, Text, View } from 'react-native'
import { LoadingIndicator } from './loading'

interface ButtonProps extends PressableProps {
  label: string
  variant?: 'primary' | 'outline' | 'secondary'
  loading?: boolean
  className?: string
  textClassName?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  iconSize?: number
}

const variantStyles = {
  primary: 'bg-primary border-primary',
  secondary: 'bg-background-secondary border-primary',
  outline: 'bg-background-white border-primary',
}

export const Button = ({
  label,
  variant = 'primary',
  loading = false,
  className,
  textClassName,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize = 20,
  style,
  ...props
}: ButtonProps) => {
  const iconColor = variant === 'primary' ? COLORS.text.primary.white : COLORS.primary

  return (
    <Pressable
      disabled={disabled}
      className={cn(
        // Base styles
        'h-12 flex-row items-center justify-center rounded-full border px-12 py-3',
        // Variants
        variantStyles[variant],
        // Disabled/Loading state
        disabled && 'opacity-50',
        className,
      )}
      style={(state) =>
        [
          { opacity: state.pressed && !disabled ? 0.8 : disabled ? 0.5 : 1 },
          typeof style === 'function' ? style(state) : style,
        ] as any
      }
      {...props}
    >
      {loading ? (
        <LoadingIndicator color={iconColor} />
      ) : (
        <>
          {LeftIcon && (
            <View className="mr-3">
              <LeftIcon size={iconSize} color={iconColor} />
            </View>
          )}
          <Text
            className={cn(
              'text-center font-semibold text-mainContent',
              variant === 'primary' ? 'text-text-primary-white' : 'text-primary',
              textClassName,
            )}
          >
            {label}
          </Text>
          {RightIcon && (
            <View className="ml-3">
              <RightIcon size={iconSize} color={iconColor} />
            </View>
          )}
        </>
      )}
    </Pressable>
  )
}
