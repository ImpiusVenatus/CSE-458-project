/**
 * Budget Game - Game state types and initial state
 */

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface BudgetCategory {
  id: string
  name: string
  allocated: number
  spent: number
}

export const BUDGET_CATEGORY_IDS = [
  'food',
  'transport',
  'utilities',
  'entertainment',
  'savings',
  'emergency_fund',
  'debt_payment',
] as const

export type BudgetCategoryId = (typeof BUDGET_CATEGORY_IDS)[number]

export interface FixedExpense {
  id: string
  name: string
  amount: number
}

export interface LedgerEntry {
  month: number
  label: string
  amount: number
  balanceAfter: number
  type: 'income' | 'expense' | 'transfer' | 'event'
}

export interface GameConfig {
  months: number
  difficulty: Difficulty
  seed: string
  scenarioId: string
}

export interface GameState {
  config: GameConfig
  currentMonth: number
  phase: 'budget' | 'events' | 'summary' | 'ended'
  eventIndex: number
  cashBalance: number
  savingsBalance: number
  emergencyFundBalance: number
  debtBalance: number
  monthlyIncome: number
  fixedExpenses: FixedExpense[]
  variableCategories: BudgetCategory[]
  creditScore: number
  qualityOfLife: number
  missedPayments: number
  ledger: LedgerEntry[]
  netWorthHistory: number[]
  creditScoreHistory: number[]
  qualityOfLifeHistory: number[]
  currentEvent: GameEvent | null
  eventQueue: GameEvent[]
  lastChoiceResult: string | null
}

export interface GameEventChoice {
  id: string
  label: string
  effects: EventEffect[]
}

export interface EventEffect {
  type: 'cash' | 'savings' | 'emergency_fund' | 'debt' | 'credit_score' | 'quality_of_life'
  amount: number
}

export interface GameEvent {
  id: string
  title: string
  description: string
  type: 'unexpected_expense' | 'unexpected_income' | 'lifestyle_choice' | 'credit_offer' | 'fee_penalty'
  amount?: number
  choices: GameEventChoice[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  monthlyIncome: number
  fixedExpenses: FixedExpense[]
  startingCash: number
  startingSavings: number
  startingEmergencyFund: number
  startingDebt: number
  startingCreditScore: number
  startingQualityOfLife: number
}

const DEFAULT_FIXED: FixedExpense[] = [
  { id: 'rent', name: 'Rent', amount: 0 },
  { id: 'utilities', name: 'Utilities', amount: 0 },
  { id: 'phone', name: 'Phone / Internet', amount: 0 },
  { id: 'insurance', name: 'Insurance', amount: 0 },
  { id: 'subscriptions', name: 'Subscriptions', amount: 0 },
]

const DEFAULT_CATEGORIES: BudgetCategory[] = BUDGET_CATEGORY_IDS.map((id) => ({
  id,
  name: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  allocated: 0,
  spent: 0,
}))

export function createInitialState(config: GameConfig, scenario: Scenario): GameState {
  const netWorth =
    scenario.startingCash +
    scenario.startingSavings +
    scenario.startingEmergencyFund -
    scenario.startingDebt
  return {
    config,
    currentMonth: 1,
    phase: 'budget',
    eventIndex: 0,
    cashBalance: scenario.startingCash,
    savingsBalance: scenario.startingSavings,
    emergencyFundBalance: scenario.startingEmergencyFund,
    debtBalance: scenario.startingDebt,
    monthlyIncome: scenario.monthlyIncome,
    fixedExpenses: [...scenario.fixedExpenses],
    variableCategories: DEFAULT_CATEGORIES.map((c) => ({ ...c, allocated: 0, spent: 0 })),
    creditScore: scenario.startingCreditScore,
    qualityOfLife: scenario.startingQualityOfLife,
    missedPayments: 0,
    ledger: [],
    netWorthHistory: [netWorth],
    creditScoreHistory: [scenario.startingCreditScore],
    qualityOfLifeHistory: [scenario.startingQualityOfLife],
    currentEvent: null,
    eventQueue: [],
    lastChoiceResult: null,
  }
}
