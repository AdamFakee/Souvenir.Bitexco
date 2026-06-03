import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { LucideIcon } from 'lucide-react-native'
import { Pressable, PressableProps, Text, View } from 'react-native'
import { LoadingIndicator } from './loading'

interface ButtonProps extends PressableProps {
  label: string
  variant?: 'primary' | 'outline' | 'secondary' | 'error'
  loading?: boolean
  className?: string
  textClassName?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  iconSize?: number
}

const variantStyles = {
  primary: 'bg-primary border-primary',
  secondary: 'bg-secondary-container border-primary',
  outline: 'bg-white border-primary',
  error: 'bg-error/10 border-error/30',
}

const disabledVariantStyles = {
  primary: 'bg-primary/50 border-primary/50',
  secondary: 'bg-secondary-container/60 border-secondary-container/60',
  outline: 'bg-surface-100 border-outline-variant',
  error: 'bg-error/5 border-error/20',
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
  const iconColor =
    variant === 'primary'
      ? '#ffffff'
      : variant === 'secondary'
        ? COLORS.secondary.onContainer
        : variant === 'error'
          ? COLORS.error.default
          : COLORS.primary.default

  return (
    <Pressable
      disabled={disabled}
      className={cn(
        // Base styles: rounded-xl matches r=12 Figma
        'h-20 flex-row items-center justify-center rounded-xl border px-12 py-3',
        // Variants
        variantStyles[variant],
        // Disabled/Loading state
        disabled && ['opacity-50', disabledVariantStyles[variant]],
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
            numberOfLines={1}
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 16,
            }}
            className={cn(
              'text-center',
              variant === 'primary'
                ? 'text-white'
                : variant === 'secondary'
                  ? 'text-secondary-on-container'
                  : variant === 'error'
                    ? 'text-error'
                    : 'text-primary', // #5b5b5c
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
