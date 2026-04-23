import { useEffect } from 'react'

export function useMounted(fn: VoidFunction) {
  useEffect(() => {
    fn()
  }, [fn])
}
