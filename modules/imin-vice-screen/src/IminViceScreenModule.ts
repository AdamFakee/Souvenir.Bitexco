import { NativeModule, requireNativeModule } from 'expo'

import { IminViceScreenModuleEvents } from './IminViceScreen.types'

declare class IminViceScreenModule extends NativeModule<IminViceScreenModuleEvents> {
  isSupportDoubleScreen(): boolean
  checkOverlayPermission(): boolean
  requestOverlayPermission(): void
  open(moduleName: string): void
  close(): void
  sendMsgToViceScreen(method: string, params: Record<string, any>): void
}

// This call loads the native module object from the JSI.
export default requireNativeModule<IminViceScreenModule>('IminViceScreen')
