/**
 * Game progress stored in localStorage.
 * Key: money-adventure-progress-{userId} or money-adventure-progress (guest)
 */

const PREFIX = 'money-adventure-progress'
const PROGRESS_EVENT = 'money-adventure-progress-updated'
const MAX_RECENT_ACTIVITY = 40
const MAX_MODULE_HISTORY = 16

export type MonitorModuleKey =
  | 'moneyCounting'
  | 'savingsVisualization'
  | 'makingChange'
  | 'needsVsWants'

export type MoneyCountingDifficulty = 'easy' | 'medium' | 'hard'
export type SavingsDecision = 'save' | 'spend'
export type MakingChangeStatus = 'served' | 'denied'

export interface RecentActivity {
  id: string
  module: MonitorModuleKey
  action: string
  detail: string
  timestamp: string
  value?: number
  secondaryValue?: number
}

export interface MoneyCountingChallengeRecord {
  id: string
  timestamp: string
  goal: number
  notesUsed: number
  minimumNotes: number
  maxAllowedNotes: number
  difficulty: MoneyCountingDifficulty
}

export interface MoneyCountingAnalytics {
  challengesCompleted: number
  completedRuns: number
  totalGoalValue: number
  totalNotesUsed: number
  lastPlayedAt?: string
  history: MoneyCountingChallengeRecord[]
}

export interface SavingsRoundRecord {
  id: string
  timestamp: string
  earned: number
}

export interface SavingsDecisionRecord {
  id: string
  timestamp: string
  decision: SavingsDecision
  amount: number
  totalSavings: number
  totalSpent: number
}

export interface SavingsVisualizationAnalytics {
  roundsPlayed: number
  totalEarned: number
  totalSaved: number
  totalSpent: number
  lastPlayedAt?: string
  roundHistory: SavingsRoundRecord[]
  decisionHistory: SavingsDecisionRecord[]
}

export interface MakingChangeTransactionRecord {
  id: string
  timestamp: string
  itemName: string
  price: number
  payTotal: number
  changeDue: number
  status: MakingChangeStatus
  usedHint: boolean
}

export interface MakingChangeAnalytics {
  customersSeen: number
  servedCount: number
  deniedCount: number
  exactChangeCount: number
  hintUses: number
  totalChangeDue: number
  lastPlayedAt?: string
  history: MakingChangeTransactionRecord[]
}

export interface NeedsVsWantsRoundRecord {
  id: string
  timestamp: string
  roundTitle: string
  score: number
  totalItems: number
  perfect: boolean
}

export interface NeedsVsWantsAnalytics {
  roundsCompleted: number
  perfectRounds: number
  correctPlacements: number
  incorrectPlacements: number
  lastPlayedAt?: string
  history: NeedsVsWantsRoundRecord[]
}

export interface ProgressData {
  moneyCounting?: {
    totalValue?: number
    analytics?: MoneyCountingAnalytics
  }
  savingsVisualization?: {
    savings?: number
    analytics?: SavingsVisualizationAnalytics
  }
  makingChange?: {
    cart?: unknown[]
    payment?: number
    analytics?: MakingChangeAnalytics
  }
  needsVsWants?: {
    needsIds?: string[]
    wantsIds?: string[]
    analytics?: NeedsVsWantsAnalytics
  }
  goalSetting?: { goals?: { id: string; current: number }[] }
  lastModule?: number
  recentActivity?: RecentActivity[]
  updatedAt?: string
}

export function getProgressKey(userId: string | null): string {
  return userId ? `${PREFIX}-${userId}` : PREFIX
}

export function getProgressEventName() {
  return PROGRESS_EVENT
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function trimHistory<T>(items: T[], limit = MAX_MODULE_HISTORY): T[] {
  return items.slice(-limit)
}

function addRecentActivity(
  progress: ProgressData,
  activity: Omit<RecentActivity, 'id' | 'timestamp'> & {
    id?: string
    timestamp?: string
  }
) {
  const item: RecentActivity = {
    id: activity.id ?? createId(activity.module),
    timestamp: activity.timestamp ?? new Date().toISOString(),
    module: activity.module,
    action: activity.action,
    detail: activity.detail,
    value: activity.value,
    secondaryValue: activity.secondaryValue,
  }

  return trimHistory([...(progress.recentActivity ?? []), item], MAX_RECENT_ACTIVITY)
}

function emitProgressUpdated(userId: string | null) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PROGRESS_EVENT, {
      detail: { key: getProgressKey(userId) },
    })
  )
}

function writeProgress(userId: string | null, data: ProgressData) {
  if (typeof window === 'undefined') return
  try {
    const key = getProgressKey(userId)
    localStorage.setItem(
      key,
      JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
      })
    )
    emitProgressUpdated(userId)
  } catch {
    // ignore
  }
}

function updateProgress(userId: string | null, updater: (current: ProgressData) => ProgressData) {
  const current = getProgress(userId)
  const next = updater(current)
  writeProgress(userId, next)
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
    const existing = getProgress(userId)
    writeProgress(userId, {
      ...existing,
      ...data,
    })
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
    emitProgressUpdated(null)
  } catch {
    // ignore
  }
}

export function recordMoneyCountingChallenge(
  userId: string | null,
  input: {
    goal: number
    notesUsed: number
    minimumNotes: number
    maxAllowedNotes: number
    difficulty: MoneyCountingDifficulty
    totalValue: number
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.moneyCounting?.analytics
    const timestamp = new Date().toISOString()
    const record: MoneyCountingChallengeRecord = {
      id: createId('money-counting'),
      timestamp,
      goal: input.goal,
      notesUsed: input.notesUsed,
      minimumNotes: input.minimumNotes,
      maxAllowedNotes: input.maxAllowedNotes,
      difficulty: input.difficulty,
    }

    return {
      ...current,
      moneyCounting: {
        ...(current.moneyCounting ?? {}),
        totalValue: input.totalValue,
        analytics: {
          challengesCompleted: (existing?.challengesCompleted ?? 0) + 1,
          completedRuns: existing?.completedRuns ?? 0,
          totalGoalValue: (existing?.totalGoalValue ?? 0) + input.goal,
          totalNotesUsed: (existing?.totalNotesUsed ?? 0) + input.notesUsed,
          lastPlayedAt: timestamp,
          history: trimHistory([...(existing?.history ?? []), record]),
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'moneyCounting',
        action: 'Completed challenge',
        detail: `${input.goal}৳ in ${input.notesUsed} notes (${input.difficulty})`,
        timestamp,
        value: input.goal,
        secondaryValue: input.notesUsed,
      }),
    }
  })
}

export function recordMoneyCountingRunComplete(
  userId: string | null,
  input: {
    challengeCount: number
    difficulty: MoneyCountingDifficulty
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.moneyCounting?.analytics
    const timestamp = new Date().toISOString()

    return {
      ...current,
      moneyCounting: {
        ...(current.moneyCounting ?? {}),
        analytics: {
          challengesCompleted: existing?.challengesCompleted ?? 0,
          completedRuns: (existing?.completedRuns ?? 0) + 1,
          totalGoalValue: existing?.totalGoalValue ?? 0,
          totalNotesUsed: existing?.totalNotesUsed ?? 0,
          lastPlayedAt: timestamp,
          history: existing?.history ?? [],
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'moneyCounting',
        action: 'Finished module run',
        detail: `${input.challengeCount} challenges completed on ${input.difficulty}`,
        timestamp,
        value: input.challengeCount,
      }),
    }
  })
}

export function recordSavingsRound(
  userId: string | null,
  input: {
    earned: number
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.savingsVisualization?.analytics
    const timestamp = new Date().toISOString()
    const record: SavingsRoundRecord = {
      id: createId('savings-round'),
      timestamp,
      earned: input.earned,
    }

    return {
      ...current,
      savingsVisualization: {
        ...(current.savingsVisualization ?? {}),
        analytics: {
          roundsPlayed: (existing?.roundsPlayed ?? 0) + 1,
          totalEarned: (existing?.totalEarned ?? 0) + input.earned,
          totalSaved: existing?.totalSaved ?? 0,
          totalSpent: existing?.totalSpent ?? 0,
          lastPlayedAt: timestamp,
          roundHistory: trimHistory([...(existing?.roundHistory ?? []), record]),
          decisionHistory: existing?.decisionHistory ?? [],
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'savingsVisualization',
        action: 'Finished savings round',
        detail: `Caught ${input.earned}৳ in coins`,
        timestamp,
        value: input.earned,
      }),
    }
  })
}

export function recordSavingsDecision(
  userId: string | null,
  input: {
    decision: SavingsDecision
    amount: number
    totalSavings: number
    totalSpent: number
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.savingsVisualization?.analytics
    const timestamp = new Date().toISOString()
    const record: SavingsDecisionRecord = {
      id: createId('savings-decision'),
      timestamp,
      decision: input.decision,
      amount: input.amount,
      totalSavings: input.totalSavings,
      totalSpent: input.totalSpent,
    }

    return {
      ...current,
      savingsVisualization: {
        ...(current.savingsVisualization ?? {}),
        savings: input.totalSavings,
        analytics: {
          roundsPlayed: existing?.roundsPlayed ?? 0,
          totalEarned: existing?.totalEarned ?? 0,
          totalSaved:
            (existing?.totalSaved ?? 0) +
            (input.decision === 'save' ? input.amount : 0),
          totalSpent:
            (existing?.totalSpent ?? 0) +
            (input.decision === 'spend' ? input.amount : 0),
          lastPlayedAt: timestamp,
          roundHistory: existing?.roundHistory ?? [],
          decisionHistory: trimHistory([
            ...(existing?.decisionHistory ?? []),
            record,
          ]),
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'savingsVisualization',
        action: input.decision === 'save' ? 'Saved coins' : 'Spent coins',
        detail:
          input.decision === 'save'
            ? `Saved ${input.amount}৳ for future goals`
            : `Spent ${input.amount}৳ from the round`,
        timestamp,
        value: input.amount,
      }),
    }
  })
}

export function recordMakingChangeTransaction(
  userId: string | null,
  input: {
    itemName: string
    price: number
    payTotal: number
    changeDue: number
    status: MakingChangeStatus
    usedHint: boolean
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.makingChange?.analytics
    const timestamp = new Date().toISOString()
    const record: MakingChangeTransactionRecord = {
      id: createId('making-change'),
      timestamp,
      itemName: input.itemName,
      price: input.price,
      payTotal: input.payTotal,
      changeDue: input.changeDue,
      status: input.status,
      usedHint: input.usedHint,
    }

    return {
      ...current,
      makingChange: {
        ...(current.makingChange ?? {}),
        payment: input.payTotal,
        analytics: {
          customersSeen: (existing?.customersSeen ?? 0) + 1,
          servedCount:
            (existing?.servedCount ?? 0) + (input.status === 'served' ? 1 : 0),
          deniedCount:
            (existing?.deniedCount ?? 0) + (input.status === 'denied' ? 1 : 0),
          exactChangeCount:
            (existing?.exactChangeCount ?? 0) +
            (input.status === 'served' && input.changeDue === 0 ? 1 : 0),
          hintUses: (existing?.hintUses ?? 0) + (input.usedHint ? 1 : 0),
          totalChangeDue: (existing?.totalChangeDue ?? 0) + input.changeDue,
          lastPlayedAt: timestamp,
          history: trimHistory([...(existing?.history ?? []), record]),
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'makingChange',
        action: input.status === 'served' ? 'Served customer' : 'Denied sale',
        detail: `${input.itemName} (${input.changeDue}৳ change due)`,
        timestamp,
        value: input.changeDue,
      }),
    }
  })
}

export function recordNeedsVsWantsDrop(
  userId: string | null,
  input: {
    itemName: string
    target: 'need' | 'want'
    correctTarget: 'need' | 'want'
    correct: boolean
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.needsVsWants?.analytics
    const timestamp = new Date().toISOString()

    return {
      ...current,
      needsVsWants: {
        ...(current.needsVsWants ?? {}),
        analytics: {
          roundsCompleted: existing?.roundsCompleted ?? 0,
          perfectRounds: existing?.perfectRounds ?? 0,
          correctPlacements:
            (existing?.correctPlacements ?? 0) + (input.correct ? 1 : 0),
          incorrectPlacements:
            (existing?.incorrectPlacements ?? 0) + (input.correct ? 0 : 1),
          lastPlayedAt: timestamp,
          history: existing?.history ?? [],
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'needsVsWants',
        action: input.correct ? 'Sorted correctly' : 'Sorted incorrectly',
        detail: `${input.itemName} placed in ${input.target.toUpperCase()}`,
        timestamp,
      }),
    }
  })
}

export function recordNeedsVsWantsRound(
  userId: string | null,
  input: {
    roundTitle: string
    score: number
    totalItems: number
    perfect: boolean
  }
) {
  updateProgress(userId, (current) => {
    const existing = current.needsVsWants?.analytics
    const timestamp = new Date().toISOString()
    const record: NeedsVsWantsRoundRecord = {
      id: createId('needs-vs-wants'),
      timestamp,
      roundTitle: input.roundTitle,
      score: input.score,
      totalItems: input.totalItems,
      perfect: input.perfect,
    }

    return {
      ...current,
      needsVsWants: {
        ...(current.needsVsWants ?? {}),
        analytics: {
          roundsCompleted: (existing?.roundsCompleted ?? 0) + 1,
          perfectRounds:
            (existing?.perfectRounds ?? 0) + (input.perfect ? 1 : 0),
          correctPlacements: existing?.correctPlacements ?? 0,
          incorrectPlacements: existing?.incorrectPlacements ?? 0,
          lastPlayedAt: timestamp,
          history: trimHistory([...(existing?.history ?? []), record]),
        },
      },
      recentActivity: addRecentActivity(current, {
        module: 'needsVsWants',
        action: 'Completed round',
        detail: `${input.roundTitle}: ${input.score}/${input.totalItems}`,
        timestamp,
        value: input.score,
        secondaryValue: input.totalItems,
      }),
    }
  })
}
