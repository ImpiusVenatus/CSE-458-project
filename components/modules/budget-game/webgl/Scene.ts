/**
 * Budget Game - WebGL scene: background + charts (net worth line, credit gauge, QoL meter)
 */

import type { GameState } from '../state/GameState'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, type Circle, type Rectangle } from '@/lib/webgl-shapes'

export interface SceneState {
  gl: WebGLRenderingContext | null
  setup: ReturnType<typeof setupBasic2D> | null
  canvas: HTMLCanvasElement | null
  animationId: number | null
}

export function createScene(canvas: HTMLCanvasElement): SceneState {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  const { gl } = initWebGL(canvas)
  if (!gl) return { gl: null, setup: null, canvas, animationId: null }
  const setup = setupBasic2D(gl, canvas)
  if (!setup) return { gl, setup: null, canvas, animationId: null }
  gl.clearColor(0.93, 0.95, 0.98, 1)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  return { gl, setup, canvas, animationId: null }
}

export function renderScene(scene: SceneState, state: GameState) {
  if (!scene.gl || !scene.setup || !scene.canvas) return
  const gl = scene.gl
  const setup = scene.setup
  const w = scene.canvas.width
  const h = scene.canvas.height

  gl.viewport(0, 0, w, h)
  if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, w, h)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const time = Date.now() / 1000

  // Parallax background: gradient-like bands
  const bandColors = ['#e0e7ff', '#fce7f3', '#d1fae5']
  for (let i = 0; i < 3; i++) {
    const band: Rectangle = {
      x: w / 2,
      y: h / 2 + Math.sin(time * 0.3 + i) * 20,
      width: w + 100,
      height: h / 3 + 40,
      color: bandColors[i],
    }
    drawRectangle(gl, setup, band)
  }

  // Animated coins/bars reacting to metrics
  const netWorth = state.cashBalance + state.savingsBalance + state.emergencyFundBalance - state.debtBalance
  const maxHist = Math.max(1, ...state.netWorthHistory)
  const norm = Math.min(1, Math.max(0, netWorth / maxHist))
  const barW = 80
  const barH = Math.max(10, norm * 120)
  const bar: Rectangle = {
    x: w - 80,
    y: h - 60 - barH / 2,
    width: barW,
    height: barH,
    color: netWorth >= 0 ? '#10b981' : '#ef4444',
  }
  drawRectangle(gl, setup, bar)

  const creditNorm = (state.creditScore - 300) / 550
  const gaugeR = 25
  const gauge: Circle = {
    x: w - 80,
    y: 80,
    radius: gaugeR + 4,
    color: '#e5e7eb',
  }
  drawCircle(gl, setup, gauge)
  const gaugeFill: Circle = {
    x: w - 80,
    y: 80,
    radius: gaugeR * Math.max(0, Math.min(1, creditNorm)),
    color: creditNorm >= 0.7 ? '#10b981' : creditNorm >= 0.4 ? '#f59e0b' : '#ef4444',
  }
  drawCircle(gl, setup, gaugeFill)

  const qolNorm = state.qualityOfLife / 100
  const qolBar: Rectangle = {
    x: 60,
    y: 80,
    width: 8,
    height: Math.max(4, qolNorm * 80),
    color: '#8b5cf6',
  }
  drawRectangle(gl, setup, qolBar)

  // Net worth line (simplified: dots for each month)
  const history = state.netWorthHistory
  if (history.length >= 2) {
    const maxNw = Math.max(...history)
    const minNw = Math.min(...history)
    const range = maxNw - minNw || 1
    const left = 40
    const right = w - 120
    const top = 180
    const bottom = h - 100
    for (let i = 0; i < history.length; i++) {
      const t = (history.length <= 1 ? 0 : i / (history.length - 1))
      const x = left + t * (right - left)
      const y = bottom - ((history[i] - minNw) / range) * (bottom - top)
      const dot: Circle = {
        x,
        y,
        radius: 4,
        color: '#3b82f6',
      }
      drawCircle(gl, setup, dot)
    }
  }
}

export function startSceneLoop(scene: SceneState, getState: () => GameState): void {
  if (!scene.gl) return
  function loop() {
    renderScene(scene, getState())
    scene.animationId = requestAnimationFrame(loop)
  }
  loop()
}

export function stopSceneLoop(scene: SceneState): void {
  if (scene.animationId != null) {
    cancelAnimationFrame(scene.animationId)
    scene.animationId = null
  }
}

export function resizeScene(scene: SceneState | null) {
  if (!scene?.canvas) return
  const rect = scene.canvas.getBoundingClientRect()
  scene.canvas.width = rect.width
  scene.canvas.height = rect.height
  if (scene.gl && scene.setup?.resolutionLocation) {
    scene.gl.viewport(0, 0, scene.canvas.width, scene.canvas.height)
    scene.gl.uniform2f(scene.setup.resolutionLocation, scene.canvas.width, scene.canvas.height)
  }
}
