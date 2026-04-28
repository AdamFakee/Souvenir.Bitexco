import { Text } from 'react-native'

interface InputErrorProps {
  message: string
}

export const InputError = ({ message }: InputErrorProps) => {
  return <Text className="ml-1 mt-1 text-body-sm font-medium text-error">{message}</Text>
}
