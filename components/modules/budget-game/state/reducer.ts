/**
 * Budget Game - Pure state updates (reducer + actions)
 */

import type {
  GameState,
  GameConfig,
  BudgetCategory,
  LedgerEntry,
  GameEvent,
  Scenario,
} from './GameState'
import { createInitialState } from './GameState'

export type GameAction =
  | { type: 'INIT'; config: GameConfig; scenario: Scenario }
  | { type: 'SET_PHASE'; phase: GameState['phase'] }
  | { type: 'SET_BUDGET'; categories: BudgetCategory[] }
  | { type: 'ADD_LEDGER'; entry: LedgerEntry }
  | { type: 'APPLY_FIXED_EXPENSES'; newCash: number }
  | { type: 'SET_BALANCES'; payload: Partial<Pick<GameState, 'cashBalance' | 'savingsBalance' | 'emergencyFundBalance' | 'debtBalance'>> }
  | { type: 'SET_METRICS'; payload: Partial<Pick<GameState, 'creditScore' | 'qualityOfLife' | 'missedPayments'>> }
  | { type: 'ADD_INCOME'; amount: number }
  | { type: 'NEXT_MONTH' }
  | { type: 'SET_EVENT_QUEUE'; events: GameEvent[] }
  | { type: 'SET_CURRENT_EVENT'; event: GameEvent | null }
  | { type: 'NEXT_EVENT' }
  | { type: 'SET_LAST_CHOICE_RESULT'; message: string | null }
  | { type: 'APPEND_HISTORY'; netWorth: number; creditScore: number; qualityOfLife: number }
  | { type: 'RESET_VARIABLE_SPENT' }
  | { type: 'ADD_VARIABLE_SPENT'; categoryId: string; amount: number }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT':
      return createInitialState(action.config, action.scenario)

    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'SET_BUDGET':
      return { ...state, variableCategories: action.categories }

    case 'ADD_LEDGER':
      return { ...state, ledger: [...state.ledger, action.entry] }

    case 'APPLY_FIXED_EXPENSES':
      return { ...state, cashBalance: action.newCash }

    case 'SET_BALANCES':
      return {
        ...state,
        cashBalance: action.payload.cashBalance ?? state.cashBalance,
        savingsBalance: action.payload.savingsBalance ?? state.savingsBalance,
        emergencyFundBalance: action.payload.emergencyFundBalance ?? state.emergencyFundBalance,
        debtBalance: action.payload.debtBalance ?? state.debtBalance,
      }
    case 'SET_METRICS':
      return {
        ...state,
        creditScore: action.payload.creditScore ?? state.creditScore,
        qualityOfLife: action.payload.qualityOfLife ?? state.qualityOfLife,
        missedPayments: action.payload.missedPayments ?? state.missedPayments,
      }
    case 'ADD_INCOME':
      return { ...state, cashBalance: state.cashBalance + action.amount }

    case 'NEXT_MONTH':
      return { ...state, currentMonth: state.currentMonth + 1, phase: 'budget', eventIndex: 0 }

    case 'SET_EVENT_QUEUE':
      return { ...state, eventQueue: action.events }

    case 'SET_CURRENT_EVENT':
      return { ...state, currentEvent: action.event }

    case 'NEXT_EVENT':
      return { ...state, eventIndex: state.eventIndex + 1 }

    case 'SET_LAST_CHOICE_RESULT':
      return { ...state, lastChoiceResult: action.message }

    case 'APPEND_HISTORY': {
      const netWorth =
        state.cashBalance +
        state.savingsBalance +
        state.emergencyFundBalance -
        state.debtBalance
      return {
        ...state,
        netWorthHistory: [...state.netWorthHistory, action.netWorth],
        creditScoreHistory: [...state.creditScoreHistory, action.creditScore],
        qualityOfLifeHistory: [...state.qualityOfLifeHistory, action.qualityOfLife],
      }
    }
    case 'RESET_VARIABLE_SPENT':
      return {
        ...state,
        variableCategories: state.variableCategories.map((c) => ({ ...c, spent: 0 })),
      }
    case 'ADD_VARIABLE_SPENT': {
      return {
        ...state,
        variableCategories: state.variableCategories.map((c) =>
          c.id === action.categoryId ? { ...c, spent: c.spent + action.amount } : c
        ),
      }
    }
    default:
      return state
  }
}
