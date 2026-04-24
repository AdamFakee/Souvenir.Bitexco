import 'expo-router/entry'
import { AppRegistry } from 'react-native'
import ViceApp from './src/screens/ViceApp'
import SecondViceApp from './src/screens/SecondViceApp'

// Đăng ký các component màn hình phụ
AppRegistry.registerComponent('ViceScreen', () => ViceApp)
AppRegistry.registerComponent('SecondViceScreen', () => SecondViceApp)
