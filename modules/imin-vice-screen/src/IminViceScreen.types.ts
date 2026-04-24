import type { StyleProp, ViewStyle } from 'react-native'

export type OnLoadEventPayload = {
  url: string
}

export type IminViceScreenModuleEvents = {
  onDataReceived: (params: OnDataReceivedEventPayload) => void
}

export type OnDataReceivedEventPayload = {
  method: string
  params: Record<string, any>
}

export type IminViceScreenViewProps = {
  url: string
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void
  style?: StyleProp<ViewStyle>
}
