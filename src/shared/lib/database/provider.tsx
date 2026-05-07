import React, { ReactNode } from 'react'
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider'
import { database } from './database'

interface AppDatabaseProviderProps {
  children: ReactNode
}

export function AppDatabaseProvider({ children }: AppDatabaseProviderProps) {
  return <DatabaseProvider database={database}>{children}</DatabaseProvider>
}
