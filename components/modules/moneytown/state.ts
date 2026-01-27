/**
 * MoneyTown - Game state types and initial state
 * Milestone 1: 2 players, 24 tiles, turn system, tile 0 (Start) and 6 (Shop) effects.
 */

export interface Player {
  id: 0 | 1
  position: number // tile index 0-23
  cash: number
}

export interface GameState {
  seed: string
  rngState: number
  currentPlayer: 0 | 1
  players: [Player, Player]
  diceResult: number | null
  phase: 'idle' | 'rolling' | 'moving' | 'landed'
  /** Target tile for current move; animating step-by-step toward this */
  moveTarget: number | null
  /** Last "Landed on Tile X" message for HUD */
  lastLandedMessage: string | null
  /** Roll button disabled during animation */
  animating: boolean
}

const START_CASH = 100
const TILE_0_BONUS = 50
const TILE_6_COST = 20

export function createInitialState(seed: string = 'demo'): GameState {
  const rngState = seedToRngState(seed)
  return {
    seed,
    rngState,
    currentPlayer: 0,
    players: [
      { id: 0, position: 0, cash: START_CASH },
      { id: 1, position: 0, cash: START_CASH },
    ],
    diceResult: null,
    phase: 'idle',
    moveTarget: null,
    lastLandedMessage: null,
    animating: false,
  }
}

function seedToRngState(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) >>> 0
  }
  return h || 1
}

export { TILE_0_BONUS, TILE_6_COST, START_CASH }
