import { Text } from 'react-native'

interface InputErrorProps {
  message: string
}

export const InputError = ({ message }: InputErrorProps) => {
  return <Text className="text-note-3 ml-1 mt-1 font-medium text-primary">{message}</Text>
}
