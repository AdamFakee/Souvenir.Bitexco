const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Config for SVGs
const { transformer, resolver } = config
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
}
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg').concat('lottie'),
  sourceExts: [...resolver.sourceExts, 'svg'],
}

module.exports = withNativeWind(config, { input: './src/app/global.css' })
