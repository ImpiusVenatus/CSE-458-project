/**
 * Budget Game - Event engine: load events, pick with seeded RNG, apply choice effects
 */

import type { GameState, GameEvent, GameEventChoice, EventEffect } from '../state/GameState'
import { createSeededRng, shuffle } from './seededRng'
import { gameReducer } from '../state/reducer'
import type { GameAction } from '../state/reducer'

export type EventPool = GameEvent[]

function applyEffects(
  state: GameState,
  effects: EventEffect[],
  dispatch: (a: GameAction) => void
): string {
  const parts: string[] = []
  let cash = state.cashBalance
  let savings = state.savingsBalance
  let emergency = state.emergencyFundBalance
  let debt = state.debtBalance
  let credit = state.creditScore
  let qol = state.qualityOfLife

  for (const e of effects) {
    const amt = e.amount
    switch (e.type) {
      case 'cash':
        cash += amt
        parts.push(amt >= 0 ? `Cash +${amt}` : `Cash ${amt}`)
        break
      case 'savings':
        savings += amt
        if (amt < 0) cash += Math.abs(amt)
        else cash -= amt
        parts.push(`Savings ${amt >= 0 ? '+' : ''}${amt}`)
        break
      case 'emergency_fund':
        emergency += amt
        if (amt < 0) cash += Math.abs(amt)
        else cash -= amt
        parts.push(`Emergency fund ${amt >= 0 ? '+' : ''}${amt}`)
        break
      case 'debt':
        debt += amt
        if (amt < 0) cash -= Math.abs(amt)
        else cash += amt
        parts.push(`Debt ${amt >= 0 ? '+' : ''}${amt}`)
        break
      case 'credit_score':
        credit = Math.max(300, Math.min(850, credit + amt))
        parts.push(`Credit ${amt >= 0 ? '+' : ''}${amt}`)
        break
      case 'quality_of_life':
        qol = Math.max(0, Math.min(100, qol + amt))
        parts.push(`QoL ${amt >= 0 ? '+' : ''}${amt}`)
        break
    }
  }

  dispatch({
    type: 'SET_BALANCES',
    payload: { cashBalance: cash, savingsBalance: savings, emergencyFundBalance: emergency, debtBalance: debt },
  })
  dispatch({ type: 'SET_METRICS', payload: { creditScore: credit, qualityOfLife: qol } })
  return parts.join(', ')
}

export function pickEventsForMonth(
  pool: EventPool,
  seed: string,
  month: number,
  count: number,
  _difficulty: GameState['config']['difficulty']
): GameEvent[] {
  const rng = createSeededRng(seed + '-' + month)
  const shuffled = shuffle(rng, [...pool])
  return shuffled.slice(0, count)
}

export function applyChoice(
  state: GameState,
  choice: GameEventChoice,
  dispatch: (a: GameAction) => void
): string {
  const msg = applyEffects(state, choice.effects, dispatch)
  dispatch({ type: 'SET_LAST_CHOICE_RESULT', message: msg })
  dispatch({ type: 'SET_CURRENT_EVENT', event: null })
  dispatch({ type: 'NEXT_EVENT' })
  return msg
}
