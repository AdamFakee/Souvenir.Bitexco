const { withAppBuildGradle } = require('@expo/config-plugins')

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addSigningConfig(config.modResults.contents)
    }
    return config
  })
}

function addSigningConfig(buildGradle) {
  if (buildGradle.includes('storeFile file("../../my-upload-key.jks")')) {
    return buildGradle
  }

  // 1. Add release block to signingConfigs
  const debugBlockRegex =
    /debug\s*\{\s*storeFile file\('debug\.keystore'\)[\s\S]*?keyPassword 'android'\s*\}/

  const releaseSigningBlock = `
        release {
            storeFile file("../../my-upload-key.jks")
            storePassword "tuan1234"
            keyAlias "my-key-alias"
            keyPassword "tuan1234"
        }`

  let updatedGradle = buildGradle
  const debugMatch = updatedGradle.match(debugBlockRegex)
  if (debugMatch) {
    const insertIndex = debugMatch.index + debugMatch[0].length
    updatedGradle =
      updatedGradle.slice(0, insertIndex) + releaseSigningBlock + updatedGradle.slice(insertIndex)
  }

  // 2. Update buildTypes.release
  const releaseRegex = /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/
  updatedGradle = updatedGradle.replace(releaseRegex, (match, p1) => {
    return `${p1}signingConfigs.release`
  })

  return updatedGradle
}

module.exports = withAndroidSigning
