import { requireNativeView } from 'expo'
import * as React from 'react'

import { IminViceScreenViewProps } from './IminViceScreen.types'

const NativeView: React.ComponentType<IminViceScreenViewProps> = requireNativeView('IminViceScreen')

export default function IminViceScreenView(props: IminViceScreenViewProps) {
  return <NativeView {...props} />
}
