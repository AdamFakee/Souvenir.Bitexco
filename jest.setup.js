// Mock các thư viện native không chạy được trong môi trường Node/Jest
import 'react-native-gesture-handler/jestSetup'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
