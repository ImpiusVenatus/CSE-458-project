/**
 * Game progress stored in localStorage.
 * Key: money-adventure-progress-{userId} or money-adventure-progress (guest)
 */

const PREFIX = 'money-adventure-progress'

export function getProgressKey(userId: string | null): string {
  return userId ? `${PREFIX}-${userId}` : PREFIX
}

export interface ProgressData {
  moneyCounting?: { totalValue?: number }
  savingsVisualization?: { savings?: number }
  makingChange?: { cart?: unknown[]; payment?: number }
  needsVsWants?: { needsIds?: string[]; wantsIds?: string[] }
  goalSetting?: { goals?: { id: string; current: number }[] }
  lastModule?: number
  updatedAt?: string
}

export function getProgress(userId: string | null): ProgressData {
  if (typeof window === 'undefined') return {}
  try {
    const key = getProgressKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressData
  } catch {
    return {}
  }
}

export function setProgress(userId: string | null, data: ProgressData): void {
  if (typeof window === 'undefined') return
  try {
    const key = getProgressKey(userId)
    const existing = getProgress(userId)
    const merged: ProgressData = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
