import { useState } from 'react'
import { useMounted } from './use-mounted'

export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useMounted(() => {
    setIsMounted(true)
  })

  return isMounted
}
