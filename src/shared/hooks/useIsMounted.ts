import { useState } from 'react'
import { useMounted } from './useMounted'

export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useMounted(() => {
    setIsMounted(true)
  })

  return isMounted
}
