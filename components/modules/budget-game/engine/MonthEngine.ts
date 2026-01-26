/**
 * Budget Game - Month progression: fixed expenses, interest, minimum payment
 */

import type { GameState, LedgerEntry } from '../state/GameState'
import { gameReducer } from '../state/reducer'

const APR = 0.24
const MONTHLY_INTEREST = APR / 12
const MIN_PAYMENT_RATE = 0.02
const LATE_FEE = 35
const CREDIT_MISSED_PENALTY = 30

export function getMinimumPayment(debtBalance: number): number {
  if (debtBalance <= 0) return 0
  return Math.max(25, Math.ceil(debtBalance * MIN_PAYMENT_RATE))
}

export function applyMonthStart(
  state: GameState,
  dispatch: (a: import('../state/reducer').GameAction) => void
): void {
  // 1) Add income
  dispatch({ type: 'ADD_INCOME', amount: state.monthlyIncome })
  const afterIncome = state.cashBalance + state.monthlyIncome
  dispatch({
    type: 'ADD_LEDGER',
    entry: {
      month: state.currentMonth,
      label: 'Monthly income',
      amount: state.monthlyIncome,
      balanceAfter: afterIncome,
      type: 'income',
    },
  })

  // 2) Pay fixed expenses
  let cash = afterIncome
  for (const exp of state.fixedExpenses) {
    cash -= exp.amount
    dispatch({
      type: 'ADD_LEDGER',
      entry: {
        month: state.currentMonth,
        label: exp.name,
        amount: -exp.amount,
        balanceAfter: cash,
        type: 'expense',
      },
    })
  }
  dispatch({ type: 'APPLY_FIXED_EXPENSES', newCash: cash })

  // 3) Interest on debt
  if (state.debtBalance > 0) {
    const interest = Math.round(state.debtBalance * MONTHLY_INTEREST * 100) / 100
    dispatch({
      type: 'SET_BALANCES',
      payload: { debtBalance: state.debtBalance + interest },
    })
    dispatch({
      type: 'ADD_LEDGER',
      entry: {
        month: state.currentMonth,
        label: 'Credit interest',
        amount: -interest,
        balanceAfter: state.cashBalance,
        type: 'expense',
      },
    })
  }
}

export function applyMonthEnd(
  state: GameState,
  dispatch: (a: import('../state/reducer').GameAction) => void
): void {
  const minPayment = getMinimumPayment(state.debtBalance)
  let newCash = state.cashBalance
  let newDebt = state.debtBalance
  let newCreditScore = state.creditScore
  let newMissed = state.missedPayments

  if (state.debtBalance > 0) {
    const paid = Math.min(minPayment, Math.min(state.cashBalance, state.debtBalance))
    if (paid >= minPayment) {
      newCash -= paid
      newDebt -= paid
      newCreditScore = Math.min(850, state.creditScore + 2)
    } else {
      newMissed += 1
      newCreditScore = Math.max(300, state.creditScore - CREDIT_MISSED_PENALTY)
      newCash -= LATE_FEE
      dispatch({
        type: 'ADD_LEDGER',
        entry: {
          month: state.currentMonth,
          label: 'Late fee (missed min payment)',
          amount: -LATE_FEE,
          balanceAfter: state.cashBalance - LATE_FEE,
          type: 'expense',
        },
      })
    }
  }
  dispatch({
    type: 'SET_BALANCES',
    payload: { cashBalance: newCash, debtBalance: newDebt },
  })
  dispatch({
    type: 'SET_METRICS',
    payload: { creditScore: newCreditScore, missedPayments: newMissed },
  })

  const netWorth = newCash + state.savingsBalance + state.emergencyFundBalance - newDebt
  dispatch({
    type: 'APPEND_HISTORY',
    netWorth,
    creditScore: newCreditScore,
    qualityOfLife: state.qualityOfLife,
  })
  dispatch({ type: 'RESET_VARIABLE_SPENT' })
  dispatch({ type: 'NEXT_MONTH' })
}
