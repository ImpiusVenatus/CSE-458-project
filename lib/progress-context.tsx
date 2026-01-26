'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { getProgress, setProgress, clearProgress, type ProgressData } from './progress'

type ProgressContextValue = {
  userId: string | null
  getProgress: () => ProgressData
  setProgress: (data: Partial<ProgressData>) => void
  clearProgress: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({
  userId,
  children,
}: {
  userId: string | null
  children: ReactNode
}) {
  const get = useCallback(() => getProgress(userId), [userId])
  const set = useCallback(
    (data: Partial<ProgressData>) => {
      const current = getProgress(userId)
      setProgress(userId, { ...current, ...data })
    },
    [userId]
  )
  const clear = useCallback(() => clearProgress(), [])

  return (
    <ProgressContext.Provider
      value={{
        userId,
        getProgress: get,
        setProgress: set,
        clearProgress: clear,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    return {
      userId: null,
      getProgress: () => ({} as ProgressData),
      setProgress: () => {},
      clearProgress: () => {},
    }
  }
  return ctx
}
