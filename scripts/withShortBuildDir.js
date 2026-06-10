const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins')
const os = require('os')

function withShortBuildDir(config) {
  // Only apply this fix on Windows to avoid modifying build directories on other OSs
  if (os.platform() !== 'win32') {
    return config
  }

  // 1. Modify project-level build.gradle to shorten buildDir for autolinked modules
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addShortBuildDir(config.modResults.contents)
    }
    return config
  })

  // 2. Modify app-level build.gradle to add CMAKE_OBJECT_PATH_MAX to CMake arguments
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addCmakeObjectPathMax(config.modResults.contents)
    }
    return config
  })

  return config
}

function addShortBuildDir(buildGradle) {
  const targetCode = '// Shorten build directory path to avoid Windows 260-character limit'
  if (buildGradle.includes(targetCode)) {
    return buildGradle
  }

  // Get the drive letter of the current project directory to avoid cross-drive issues
  const currentDrive = (process.cwd() || 'C').split(':')[0] || 'C'

  // Define the code to inject
  const injection = `
  // Shorten build directory path to avoid Windows 260-character limit
  if (project.name.endsWith("_autolinked_build")) {
    def shortName = project.name.length() > 10 ? project.name.hashCode().abs().toString(36) : project.name
    layout.buildDirectory.set(file("${currentDrive}:/b/\${shortName}"))
  }
`

  // Insert inside allprojects {
  const allprojectsRegex = /allprojects\s*\{/
  if (allprojectsRegex.test(buildGradle)) {
    return buildGradle.replace(allprojectsRegex, `allprojects {${injection}`)
  }

  return buildGradle
}

function addCmakeObjectPathMax(buildGradle) {
  const targetCode = '-DCMAKE_OBJECT_PATH_MAX=128'
  if (buildGradle.includes(targetCode)) {
    return buildGradle
  }

  const injection = `
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=128"
            }
        }
`

  const defaultConfigRegex = /defaultConfig\s*\{/
  if (defaultConfigRegex.test(buildGradle)) {
    return buildGradle.replace(defaultConfigRegex, `defaultConfig {${injection}`)
  }

  return buildGradle
}

module.exports = withShortBuildDir
