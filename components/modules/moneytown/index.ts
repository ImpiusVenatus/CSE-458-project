/**
 * MoneyTown - Entry: lifecycle init/start/pause/resume/destroy
 * Milestone 1: 24-tile board, 2 players, Roll, tile-by-tile move, Tile 0 and 6 effects.
 */

import type { GameState } from './state'
import { createInitialState } from './state'
import { doRoll, stepMove, nextTurn } from './engine'
import { createRenderer, resizeRenderer, render, destroyRenderer, type RenderState } from './webgl/renderer'
import { buildHUD, triggerHUDRender } from './ui/hud'

export interface SharedServices {
  sound?: { play?: (id: string) => void }
}

export interface MoneyTownAPI {
  init: (containerEl: HTMLElement, shared?: SharedServices) => void
  start: () => void
  pause: () => void
  resume: () => void
  destroy: () => void
}

const MOVE_DELAY_MS = 350

export function createMoneyTown(): MoneyTownAPI {
  let state: GameState | null = null
  let container: HTMLElement | null = null
  let canvas: HTMLCanvasElement | null = null
  let overlayDiv: HTMLDivElement | null = null
  let renderer: RenderState | null = null
  let hudTeardown: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null
  let moveIntervalId: ReturnType<typeof setInterval> | null = null
  let animationFrameId: number | null = null
  let paused = false

  function getState(): GameState {
    if (!state) throw new Error('MoneyTown not initialized')
    return state
  }

  function redraw() {
    if (!state || !container || !renderer) return
    render(renderer, state)
    triggerHUDRender(container)
  }

  function onRoll() {
    if (!state || !container || !renderer) return
    doRoll(state)
    redraw()
    if (!state.animating) return
    moveIntervalId = setInterval(() => {
      if (!state || paused) return
      const landed = stepMove(state)
      redraw()
      if (landed) {
        if (moveIntervalId != null) {
          clearInterval(moveIntervalId)
          moveIntervalId = null
        }
        nextTurn(state)
        redraw()
      }
    }, MOVE_DELAY_MS)
  }

  function gameLoop() {
    if (!state || !renderer || paused) {
      animationFrameId = requestAnimationFrame(gameLoop)
      return
    }
    render(renderer, state)
    animationFrameId = requestAnimationFrame(gameLoop)
  }

  return {
    init(containerEl: HTMLElement, shared?: SharedServices) {
      container = containerEl
      container.innerHTML = ''
      canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;'
      container.appendChild(canvas)
      overlayDiv = document.createElement('div')
      overlayDiv.style.cssText = 'position:absolute;inset:0;pointer-events:auto;z-index:20;'
      container.appendChild(overlayDiv)
      renderer = createRenderer(canvas)
      resizeObserver = new ResizeObserver(() => {
        if (renderer) resizeRenderer(renderer)
        const hud = container?.querySelector('.moneytown-hud') as HTMLElement & { __mtUpdateLabels?: () => void }
        hud?.__mtUpdateLabels?.()
      })
      resizeObserver.observe(canvas)
      state = createInitialState('demo')
      hudTeardown = buildHUD(overlayDiv, getState, { onRoll })
      redraw()
    },

    start() {
      if (!state) state = createInitialState('demo')
      if (container) {
        triggerHUDRender(container)
        ;(container.querySelector('.moneytown-hud') as HTMLElement)?.focus?.()
      }
      if (renderer && animationFrameId == null) {
        animationFrameId = requestAnimationFrame(gameLoop)
      }
    },

    pause() {
      paused = true
    },

    resume() {
      paused = false
    },

    destroy() {
      if (moveIntervalId != null) {
        clearInterval(moveIntervalId)
        moveIntervalId = null
      }
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      resizeObserver?.disconnect()
      resizeObserver = null
      hudTeardown?.()
      hudTeardown = null
      if (renderer) {
        destroyRenderer(renderer)
        renderer = null
      }
      canvas = null
      overlayDiv = null
      container = null
      state = null
      paused = false
    },
  }
}
