/**
 * MoneyTown - Turn system, movement, tile effects
 * Milestone 1: Roll, move tile-by-tile, apply Tile 0 (Start) and Tile 6 (Shop).
 */

import type { GameState, Player } from './state'
import { TILE_0_BONUS, TILE_6_COST } from './state'
import { rollDice } from './rng'

const NUM_TILES = 24

/**
 * Advance to next player's turn.
 */
export function nextTurn(state: GameState): void {
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0
  state.diceResult = null
  state.phase = 'idle'
  state.moveTarget = null
  state.lastLandedMessage = null
}

/**
 * Roll dice (1-6), set phase to moving and target tile.
 */
export function doRoll(state: GameState): void {
  if (state.phase !== 'idle' || state.animating) return
  const player = state.players[state.currentPlayer]
  const roll = rollDice(state)
  state.diceResult = roll
  state.phase = 'rolling'
  const nextPos = (player.position + roll) % NUM_TILES
  state.moveTarget = nextPos
  state.phase = 'moving'
  state.animating = true
}

/**
 * Move current player one step toward moveTarget. Returns true when landing complete.
 * Call repeatedly with small delay for tile-by-tile animation.
 */
export function stepMove(state: GameState): boolean {
  const player = state.players[state.currentPlayer]
  const target = state.moveTarget
  if (target == null || !state.animating) return false

  if (player.position === target) {
    state.animating = false
    state.phase = 'landed'
    state.lastLandedMessage = `Landed on Tile ${target}`
    applyTileEffect(state, target)
    return true
  }

  const fromPos = player.position
  player.position = (fromPos + 1) % NUM_TILES
  const toPos = player.position
  if (fromPos > toPos) checkPassStart(state, fromPos, toPos)
  return false
}

/**
 * Apply Milestone 1 tile effects when landing on a tile.
 * Tile 0 (Start): +50 coins when pass or land.
 * Tile 6 (Shop): -20 when land.
 */
function applyTileEffect(state: GameState, tileIndex: number): void {
  const player = state.players[state.currentPlayer]
  if (tileIndex === 0) {
    player.cash += TILE_0_BONUS
  } else if (tileIndex === 6) {
    player.cash = Math.max(0, player.cash - TILE_6_COST)
  }
}

/**
 * When passing Start (tile 0) during movement, add +50.
 * Called each step: if we step onto 0, we already applied on land; if we pass 0 (wrap), add bonus.
 */
export function checkPassStart(state: GameState, fromPosition: number, toPosition: number): void {
  if (fromPosition > toPosition) {
    state.players[state.currentPlayer].cash += TILE_0_BONUS
  }
}
