module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind', reactCompiler: true }],
      'nativewind/babel',
    ],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  }
}
