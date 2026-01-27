/**
 * MoneyTown - Seeded LCG (Linear Congruential Generator)
 * Deterministic: same seed + same sequence of calls => same dice rolls.
 * State is stored in game state for replay/determinism.
 */

const LCG_A = 1664525
const LCG_C = 1013904223
const LCG_M = 2 ** 32

/**
 * Advance LCG state and return next float in [0, 1).
 */
export function nextRng(state: number): number {
  const next = (LCG_A * state + LCG_C) >>> 0
  return (next % LCG_M) / LCG_M
}

/**
 * Advance state in-place and return next float.
 */
export function stepRng(state: { rngState: number }): number {
  const n = (LCG_A * state.rngState + LCG_C) >>> 0
  state.rngState = n
  return (n % LCG_M) / LCG_M
}

/**
 * Roll a die 1-6 using current state.
 */
export function rollDice(state: { rngState: number }): number {
  const r = stepRng(state)
  return Math.floor(r * 6) + 1
}
