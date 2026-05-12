import { usePosStore } from '../store/use-pos-store'

export function usePosActor() {
  const posService = usePosStore((s) => s.posService)

  return posService
}
