/**
 * MoneyTown - Light HTML overlay: current player, dice, cash, Roll button, landed message.
 * Tile names and center "MoneyTown" title use the same coordinate mapping as the renderer.
 */

import type { GameState } from '../state'
import { TILE_NAMES } from '../tiles'

const BOARD_MARGIN = 56

function getTileCenterPx(
  tileIndex: number,
  w: number,
  h: number
): { x: number; y: number } {
  const left = BOARD_MARGIN
  const right = w - BOARD_MARGIN
  const top = BOARD_MARGIN
  const bottom = h - BOARD_MARGIN
  const tileW = (right - left) / 6
  const tileH = (bottom - top) / 6
  if (tileIndex < 6) {
    return { x: left + (tileIndex + 0.5) * tileW, y: bottom }
  }
  if (tileIndex < 12) {
    const j = tileIndex - 6
    return { x: right, y: bottom - (j + 0.5) * tileH }
  }
  if (tileIndex < 18) {
    const k = tileIndex - 12
    return { x: right - (k + 0.5) * tileW, y: top }
  }
  const l = tileIndex - 18
  return { x: left, y: top + (l + 0.5) * tileH }
}

export interface HUDCallbacks {
  onRoll: () => void
}

export function buildHUD(
  container: HTMLElement,
  getState: () => GameState,
  callbacks: HUDCallbacks
): () => void {
  const root = document.createElement('div')
  root.className = 'moneytown-hud'
  root.setAttribute('tabindex', '-1')
  root.innerHTML = `
    <div class="mt-hud-panel mt-hud-top">
      <span class="mt-current-player" data-current-player></span>
      <span class="mt-dice" data-dice>—</span>
      <span class="mt-cash-p1" data-cash-p1></span>
      <span class="mt-cash-p2" data-cash-p2></span>
    </div>
    <div class="mt-board-title" data-board-title>MoneyTown</div>
    <div class="mt-tile-labels" data-tile-labels></div>
    <div class="mt-hud-panel mt-hud-bottom">
      <p class="mt-landed" data-landed></p>
      <button type="button" class="mt-roll" data-roll>Roll</button>
    </div>
  `
  const style = document.createElement('style')
  style.textContent = `
    .moneytown-hud { position: absolute; inset: 0; pointer-events: none; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; }
    .moneytown-hud * { box-sizing: border-box; }
    .mt-hud-panel { pointer-events: auto; padding: 12px 16px; }
    .mt-hud-top { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: rgba(255,255,255,0.9); border-radius: 8px; margin: 12px; }
    .mt-hud-bottom { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: rgba(255,255,255,0.9); border-radius: 8px; margin: 12px; }
    .dark .mt-hud-top, .dark .mt-hud-bottom { background: rgba(31,41,55,0.95); }
    .mt-current-player { font-weight: 700; color: #1f2937; }
    .dark .mt-current-player { color: #f3f4f6; }
    .mt-dice { font-size: 1.2rem; min-width: 2ch; color: #374151; }
    .dark .mt-dice { color: #e5e7eb; }
    .mt-cash-p1, .mt-cash-p2 { font-size: 0.9rem; color: #374151; }
    .dark .mt-cash-p1, .dark .mt-cash-p2 { color: #d1d5db; }
    .mt-landed { margin: 0; font-size: 0.95rem; color: #059669; }
    .dark .mt-landed { color: #34d399; }
    .mt-roll { padding: 10px 24px; border-radius: 8px; border: none; background: #f59e0b; color: #fff; font-weight: 600; cursor: pointer; font-size: 1rem; }
    .mt-roll:hover:not(:disabled) { background: #d97706; }
    .mt-roll:disabled { opacity: 0.6; cursor: not-allowed; }
    .mt-board-title { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; font-size: clamp(1.5rem, 4vw, 2.5rem); font-weight: 800; color: #166534; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.1); z-index: 2; }
    .dark .mt-board-title { color: #4ade80; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
    .mt-tile-labels { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
    .mt-tile-label { position: absolute; max-width: 52px; padding: 2px 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; line-height: 1.1; text-align: center; color: #1f2937; background: rgba(255,255,255,0.92); border-radius: 4px; transform: translate(-50%, -50%); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
    .dark .mt-tile-label { color: #f3f4f6; background: rgba(31,41,55,0.92); }
  `
  root.appendChild(style)
  container.appendChild(root)

  const tileLabelsEl = root.querySelector('[data-tile-labels]') as HTMLElement
  const rollBtn = root.querySelector('[data-roll]') as HTMLButtonElement
  rollBtn.addEventListener('click', () => {
    callbacks.onRoll()
  })

  function updateLabels() {
    if (!tileLabelsEl) return
    const w = container.offsetWidth || 400
    const h = container.offsetHeight || 300
    tileLabelsEl.innerHTML = ''
    for (let i = 0; i < 24; i++) {
      const c = getTileCenterPx(i, w, h)
      const el = document.createElement('span')
      el.className = 'mt-tile-label'
      el.textContent = TILE_NAMES[i] ?? String(i)
      el.style.left = `${c.x}px`
      el.style.top = `${c.y}px`
      tileLabelsEl.appendChild(el)
    }
  }

  function render() {
    const state = getState()
    const cur = root.querySelector('[data-current-player]')
    if (cur) cur.textContent = `Player ${state.currentPlayer + 1}'s turn`
    const diceEl = root.querySelector('[data-dice]')
    if (diceEl) diceEl.textContent = state.diceResult != null ? String(state.diceResult) : '—'
    const p1 = root.querySelector('[data-cash-p1]')
    if (p1) p1.textContent = `P1: $${state.players[0].cash}`
    const p2 = root.querySelector('[data-cash-p2]')
    if (p2) p2.textContent = `P2: $${state.players[1].cash}`
    const landed = root.querySelector('[data-landed]')
    if (landed) landed.textContent = state.lastLandedMessage || ''
    if (rollBtn) rollBtn.disabled = state.animating
  }

  updateLabels()
  render()
  ;(root as any).__mtRender = render
  ;(root as any).__mtUpdateLabels = updateLabels

  return () => {
    container.removeChild(root)
  }
}

export function triggerHUDRender(container: HTMLElement): void {
  const root = container.querySelector('.moneytown-hud')
  const render = (root as any)?.__mtRender
  if (render) render()
}
