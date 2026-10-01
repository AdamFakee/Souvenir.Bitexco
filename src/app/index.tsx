import { COLORS } from '@/shared/constants'
import { LogoSkystore } from '@/shared/components/ui/icons'
import { ActivityIndicator, View } from 'react-native'

/**
 * Entry point của App - render Loading spinner trong khi useAuthGuard
 * đang kiểm tra state và thực hiện điều hướng phù hợp
 */
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary.default,
      }}
    >
      <LogoSkystore width={260} height={130} color="#ffffff" />
      <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 24 }} />
    </View>
  )
}
