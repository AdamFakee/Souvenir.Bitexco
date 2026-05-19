import { NativeModule, requireNativeModule } from 'expo'

declare class PaymentPortableModule extends NativeModule {
  doConnect(
    posUrl: string,
    merchantName: string,
    cashierId: string,
    license: string,
  ): Promise<string>

  doCommand(command: string): Promise<string>
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PaymentPortableModule>('PaymentPortable')
