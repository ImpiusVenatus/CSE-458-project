/**
 * Budget Game - Scoring (Savings Health, Credit Score, QoL, Overall)
 */

import type { GameState } from '../state/GameState'

const CREDIT_MIN = 300
const CREDIT_MAX = 850
const QOL_MAX = 100

/** Savings Health 0-100: savings + emergency fund vs monthly expenses */
export function computeSavingsHealth(state: GameState): number {
  const totalSavings = state.savingsBalance + state.emergencyFundBalance
  const monthlyOut = state.fixedExpenses.reduce((s, e) => s + e.amount, 0) + state.debtBalance * 0.02
  if (monthlyOut <= 0) return 100
  const monthsCovered = totalSavings / monthlyOut
  return Math.min(100, Math.round(monthsCovered * 15))
}

/** Credit score is already 300-850 in state */
export function getCreditScore(state: GameState): number {
  return Math.max(CREDIT_MIN, Math.min(CREDIT_MAX, state.creditScore))
}

/** Quality of life 0-100 */
export function getQualityOfLife(state: GameState): number {
  return Math.max(0, Math.min(QOL_MAX, state.qualityOfLife))
}

/** Overall: 35% savings, 35% credit (normalized to 0-100), 30% QoL */
export function computeOverallScore(state: GameState): number {
  const savings = computeSavingsHealth(state)
  const creditNorm = ((state.creditScore - CREDIT_MIN) / (CREDIT_MAX - CREDIT_MIN)) * 100
  const qol = getQualityOfLife(state)
  return Math.round(0.35 * savings + 0.35 * creditNorm + 0.3 * qol)
}

export function getScoreBreakdown(state: GameState): {
  savingsHealth: number
  creditScore: number
  creditNorm: number
  qualityOfLife: number
  overall: number
} {
  const savingsHealth = computeSavingsHealth(state)
  const creditScore = getCreditScore(state)
  const creditNorm = ((creditScore - CREDIT_MIN) / (CREDIT_MAX - CREDIT_MIN)) * 100
  const qualityOfLife = getQualityOfLife(state)
  const overall = computeOverallScore(state)
  return { savingsHealth, creditScore, creditNorm, qualityOfLife, overall }
}
