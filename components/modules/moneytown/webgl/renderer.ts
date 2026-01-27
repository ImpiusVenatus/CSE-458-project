/**
 * MoneyTown - WebGL renderer: Monopoly-style board with center area, 24 pastel tiles, tokens, dice.
 * Tiles run clockwise: bottom 0-5, right 6-11, top 12-17, left 18-23. Corners at 0, 6, 12, 18.
 */

import type { GameState } from '../state'
import { getTileColor } from '../tiles'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, type Circle, type Rectangle } from '@/lib/webgl-shapes'

const BOARD_MARGIN = 56
const NUM_TILES = 24
const CORNER_TILES = [0, 6, 12, 18]

export interface RenderState {
  gl: WebGLRenderingContext | null
  setup: ReturnType<typeof setupBasic2D> | null
  canvas: HTMLCanvasElement | null
  animationId: number | null
}

/**
 * Get pixel (x, y) center of a tile on the board perimeter.
 * Board: rectangle from (left, top) to (right, bottom). 6 tiles per side.
 */
function getTileCenter(
  tileIndex: number,
  left: number,
  right: number,
  top: number,
  bottom: number
): { x: number; y: number } {
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

export function createRenderer(canvas: HTMLCanvasElement): RenderState {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  const { gl } = initWebGL(canvas)
  if (!gl) return { gl: null, setup: null, canvas, animationId: null }
  const setup = setupBasic2D(gl, canvas)
  if (!setup) return { gl, setup: null, canvas, animationId: null }
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  return { gl, setup, canvas, animationId: null }
}

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function resizeRenderer(renderer: RenderState | null): void {
  if (!renderer?.canvas) return
  const rect = renderer.canvas.getBoundingClientRect()
  renderer.canvas.width = rect.width
  renderer.canvas.height = rect.height
}

export function render(renderer: RenderState, state: GameState): void {
  if (!renderer.gl || !renderer.setup || !renderer.canvas) return
  const gl = renderer.gl
  const setup = renderer.setup
  const w = renderer.canvas.width
  const h = renderer.canvas.height
  const dark = isDarkMode()

  gl.viewport(0, 0, w, h)
  if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, w, h)
  if (dark) gl.clearColor(0.12, 0.14, 0.18, 1)
  else gl.clearColor(0.93, 0.93, 0.9, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const left = BOARD_MARGIN
  const right = w - BOARD_MARGIN
  const top = BOARD_MARGIN
  const bottom = h - BOARD_MARGIN
  const tileW = (right - left) / 6
  const tileH = (bottom - top) / 6
  const trackW = tileW * 0.92
  const trackH = tileH * 0.7
  const cornerScale = 1.08

  // 1) Center area (cream/light) – Monopoly-style empty middle for title
  const innerLeft = left + trackW
  const innerRight = right - trackW
  const innerTop = top + trackH
  const innerBottom = bottom - trackH
  const centerRect: Rectangle = {
    x: (innerLeft + innerRight) / 2,
    y: (innerTop + innerBottom) / 2,
    width: innerRight - innerLeft,
    height: innerBottom - innerTop,
    color: dark ? '#1f2937' : '#fefce8',
  }
  drawRectangle(gl, setup, centerRect)

  // 2) Board tiles (24 pastel rectangles along perimeter; corners slightly larger)
  for (let i = 0; i < NUM_TILES; i++) {
    const c = getTileCenter(i, left, right, top, bottom)
    const isCorner = CORNER_TILES.includes(i)
    const tw = isCorner ? trackW * cornerScale : trackW
    const th = isCorner ? trackH * cornerScale : trackH
    const rect: Rectangle = {
      x: c.x,
      y: c.y,
      width: tw,
      height: th,
      color: getTileColor(i, dark),
    }
    drawRectangle(gl, setup, rect)
  }

  // 3) Player tokens (circles) at current positions; offset slightly so both visible on same tile
  const tokenRadius = Math.min(trackW, trackH) * 0.22
  for (let p = 0; p < 2; p++) {
    const pos = state.players[p].position
    const tc = getTileCenter(pos, left, right, top, bottom)
    const offsetX = p === 0 ? -tokenRadius : tokenRadius
    const token: Circle = {
      x: tc.x + offsetX,
      y: tc.y,
      radius: tokenRadius,
      color: p === 0 ? '#3b82f6' : '#f59e0b',
    }
    drawCircle(gl, setup, token)
  }

  // Dice: 2D square in top-right corner (number shown in HUD overlay)
  const diceSize = 56
  const diceX = w - BOARD_MARGIN - diceSize / 2
  const diceY = top + diceSize / 2 + 8
  const border: Rectangle = {
    x: diceX,
    y: diceY,
    width: diceSize + 4,
    height: diceSize + 4,
    color: '#92400e',
  }
  drawRectangle(gl, setup, border)
  const diceRect: Rectangle = {
    x: diceX,
    y: diceY,
    width: diceSize,
    height: diceSize,
    color: '#fef3c7',
  }
  drawRectangle(gl, setup, diceRect)
}

export function destroyRenderer(renderer: RenderState): void {
  if (renderer.animationId != null) {
    cancelAnimationFrame(renderer.animationId)
    renderer.animationId = null
  }
}
