// Reexport the native module. On web, it will be resolved to IminViceScreenModule.web.ts
// and on native platforms to IminViceScreenModule.ts
export * from './src/IminViceScreen.types'
export { default } from './src/IminViceScreenModule'
export { default as IminViceScreenView } from './src/IminViceScreenView'
