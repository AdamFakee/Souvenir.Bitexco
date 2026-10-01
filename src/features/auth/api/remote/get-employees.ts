import { AxiosService } from '@/shared/lib/axios/axios.service'
import { useQuery } from '@tanstack/react-query'

export interface GetEmployeesParams {
  shiftId?: string
  status?: string
  isPos?: boolean
  hasTransaction?: boolean
}

export const getEmployeesQueryKey = (params?: string | GetEmployeesParams) =>
  ['auth', 'employees', params] as const

export async function getEmployees(paramsOrShiftId?: string | GetEmployeesParams): Promise<any> {
  try {
    const axios = AxiosService.getInstance()
    let params: Record<string, any> = {}
    if (typeof paramsOrShiftId === 'string') {
      params.shiftId = paramsOrShiftId
    } else if (paramsOrShiftId && typeof paramsOrShiftId === 'object') {
      params = { ...paramsOrShiftId }
    }
    const response = await axios.get<any>('/v1/pos/employees', { params })
    return response.data
  } catch {
    return null
  }
}

export const getEmployeesQueryOptions = (params?: string | GetEmployeesParams) => ({
  queryKey: getEmployeesQueryKey(params),
  queryFn: () => getEmployees(params),
})

export const useGetEmployees = (params?: string | GetEmployeesParams) => {
  return useQuery(getEmployeesQueryOptions(params))
}
