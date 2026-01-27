'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, drawRoundedRectangle, isPointInCircle, isPointInRectangle, getCanvasCoordinates, Circle, Rectangle, RoundedRectangle } from '@/lib/webgl-shapes'

interface CurrencyItem {
  id: string
  type: 'coin' | 'bill'
  value: number
  x: number
  y: number
  color: string
  radius?: number
  width?: number
  height?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
}

const COUNTING_AREA_Y_OFFSET = 100
const COUNTING_AREA_HALF_HEIGHT = 40
const GOAL_POOL = [10, 20, 30, 50, 100, 150, 200, 250, 500]
const CHALLENGE_COUNT = 12

function generateChallenges(): number[] {
  const out: number[] = []
  for (let i = 0; i < CHALLENGE_COUNT; i++) {
    out.push(GOAL_POOL[Math.floor(Math.random() * GOAL_POOL.length)])
  }
  return out
}

function addBurst(particlesRef: React.MutableRefObject<Particle[]>, x: number, y: number) {
  const colors = ['#fef08a', '#fde047', '#facc15', '#fef3c7']
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5
    const speed = 80 + Math.random() * 120
    particlesRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1,
      radius: 4 + Math.random() * 5,
      color: colors[i % colors.length],
    })
  }
}

// Bangladesh currency: coins (all silver), notes (10–1000 Tk with distinct colors)
const BANGLADESH_CURRENCY: Omit<CurrencyItem, 'x' | 'y'>[] = [
  { id: 'coin-1', type: 'coin', value: 1, color: '#b8b8b8', radius: 26 },
  { id: 'coin-2', type: 'coin', value: 2, color: '#a8a8a8', radius: 30 },
  { id: 'coin-5', type: 'coin', value: 5, color: '#989898', radius: 34 },
  { id: 'bill-10', type: 'bill', value: 10, color: '#b85445', width: 76, height: 38 },
  { id: 'bill-20', type: 'bill', value: 20, color: '#3d9b5c', width: 76, height: 38 },
  { id: 'bill-50', type: 'bill', value: 50, color: '#e89550', width: 76, height: 38 },
  { id: 'bill-100', type: 'bill', value: 100, color: '#3b82b6', width: 76, height: 38 },
  { id: 'bill-200', type: 'bill', value: 200, color: '#d4af37', width: 76, height: 38 },
  { id: 'bill-500', type: 'bill', value: 500, color: '#40916c', width: 76, height: 38 },
  { id: 'bill-1000', type: 'bill', value: 1000, color: '#6b7280', width: 76, height: 38 },
]

const HEADER_HEIGHT = 80
const PALETTE_Y = HEADER_HEIGHT + 28
const PALETTE_BAR_HEIGHT = 56
const PALETTE_PADDING = 50

/** Palette items stay fixed at top; positions depend on canvas width. */
function getPaletteItems(canvasWidth: number): CurrencyItem[] {
  const n = BANGLADESH_CURRENCY.length
  const spacing = (canvasWidth - 2 * PALETTE_PADDING) / Math.max(1, n - 1)
  return BANGLADESH_CURRENCY.map((item, i) => {
    const x = PALETTE_PADDING + i * spacing
    return { ...item, id: `palette-${item.id}`, x, y: PALETTE_Y }
  })
}

function createDuplicate(template: Omit<CurrencyItem, 'x' | 'y'>, x: number, y: number): CurrencyItem {
  const id = `placed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return { ...template, id, x, y }
}

function getCountingAreaY(canvasHeight: number) {
  return canvasHeight - COUNTING_AREA_Y_OFFSET
}

function isInCountingArea(item: CurrencyItem, canvasHeight: number): boolean {
  const cy = getCountingAreaY(canvasHeight)
  const top = cy - COUNTING_AREA_HALF_HEIGHT
  const bottom = cy + COUNTING_AREA_HALF_HEIGHT
  return item.y >= top && item.y <= bottom
}

function isPlaced(item: CurrencyItem): boolean {
  return item.id.startsWith('placed-')
}

export default function MoneyCounting() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [displayTotal, setDisplayTotal] = useState(0)
  const [showInstructions, setShowInstructions] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500, displayW: 800, displayH: 500 })
  const [placedItems, setPlacedItems] = useState<CurrencyItem[]>([])
  const [challenges, setChallenges] = useState<number[]>(() => generateChallenges())
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [celebration, setCelebration] = useState(false)
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paletteItems = getPaletteItems(canvasSize.w)
  const allItems = [...paletteItems, ...placedItems]
  const goal = challenges[challengeIndex] ?? 0
  const itemsRef = useRef<CurrencyItem[]>(allItems)
  const selectedRef = useRef<string | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const displayTotalRef = useRef(0)
  const lastDisplayRef = useRef(0)
  const lastWonGoalRef = useRef<number | null>(null)
  const cursorRef = useRef({ x: -1000, y: -1000, inside: false })

  useEffect(() => {
    itemsRef.current = allItems
    selectedRef.current = selectedItem
  }, [allItems, selectedItem])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    updateCanvasSize()

    const { gl } = initWebGL(canvas)
    if (!gl) return

    const setup = setupBasic2D(gl, canvas)
    if (!setup) return

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const handleResize = () => {
      updateCanvasSize()
      const rect = canvas.getBoundingClientRect()
      setCanvasSize({ w: canvas.width, h: canvas.height, displayW: rect.width, displayH: rect.height })
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, canvas.width, canvas.height)
    }

    let lastTime = performance.now()
    const startTime = lastTime

    // Floating particles: random movement only (no cursor interaction)
    const JOLLY_COLORS = ['#fef08a', '#fde047', '#facc15', '#fef3c7', '#a7f3d0', '#6ee7b7', '#fbcfe8', '#f9a8d4', '#c4b5fd', '#a78bfa', '#fcd34d', '#fbbf24']
    const numFloating = 55
    const floatingParticles: { x: number; y: number; vx: number; vy: number; phase: number; size: number; color: string }[] = []
    const playTopInit = PALETTE_Y + PALETTE_BAR_HEIGHT / 2 + 24
    for (let i = 0; i < numFloating; i++) {
      floatingParticles.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: playTopInit + Math.random() * (canvas.height - COUNTING_AREA_Y_OFFSET - playTopInit - 40),
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        phase: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 3.5,
        color: JOLLY_COLORS[i % JOLLY_COLORS.length],
      })
    }

    const render = (time: number) => {
      const w = canvas.width
      const h = canvas.height
      const dt = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time
      const t = (time - startTime) / 1000

      gl.viewport(0, 0, w, h)
      if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, w, h)
      gl.clearColor(0.11, 0.13, 0.16, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // Palette strip (tap & drag from here) – drawn below header
      const paletteBar: Rectangle = {
        x: w / 2,
        y: PALETTE_Y,
        width: w,
        height: PALETTE_BAR_HEIGHT,
        color: '#1a2332',
      }
      drawRectangle(gl, setup, paletteBar)
      const paletteBorder: Rectangle = {
        x: w / 2,
        y: PALETTE_Y + PALETTE_BAR_HEIGHT / 2,
        width: w,
        height: 2,
        color: '#334155',
      }
      drawRectangle(gl, setup, paletteBorder)

      const countingY = getCountingAreaY(h)
      const playTop = PALETTE_Y + PALETTE_BAR_HEIGHT / 2 + 24
      const playBottom = h - COUNTING_AREA_Y_OFFSET - 20

      for (let i = 0; i < floatingParticles.length; i++) {
        const p = floatingParticles[i]
        const bouncy = 0.8 * Math.sin(t * 2.2 + p.phase) + 0.6 * Math.cos(t * 1.7 + p.phase * 0.9)
        p.vx += bouncy * 0.35
        p.vy += bouncy * 0.3
        p.vx += (Math.random() - 0.5) * 0.4
        p.vy += (Math.random() - 0.5) * 0.4
        p.vx *= 0.985
        p.vy *= 0.985
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < 20) { p.x = 20; p.vx *= -0.6 }
        if (p.x > w - 20) { p.x = w - 20; p.vx *= -0.6 }
        if (p.y < playTop) { p.y = playTop; p.vy *= -0.6 }
        if (p.y > playBottom) { p.y = playBottom; p.vy *= -0.6 }
        const twinkle = 0.7 + 0.35 * Math.sin(t * 3 + p.phase)
        const radius = p.size * twinkle
        drawCircle(gl, setup, { x: p.x, y: p.y, radius, color: p.color })
      }

      const items = itemsRef.current
      const selected = selectedRef.current
      const totalHere = items
        .filter((it) => isPlaced(it) && isInCountingArea(it, h))
        .reduce((s, it) => s + it.value, 0)

      displayTotalRef.current += (totalHere - displayTotalRef.current) * 0.12
      const rounded = Math.round(displayTotalRef.current)
      if (rounded !== lastDisplayRef.current) {
        lastDisplayRef.current = rounded
        setDisplayTotal(rounded)
      }

      // Counting area
      const pulse = totalHere > 0 ? 0.08 + 0.04 * Math.sin(t * 4) : 0
      const countingArea: Rectangle = {
        x: w / 2,
        y: countingY,
        width: w - 100,
        height: 80,
        color: totalHere > 0 ? '#1e3a5f' : '#1e293b',
      }
      drawRectangle(gl, setup, countingArea)
      if (totalHere > 0) {
        const glow: Rectangle = {
          x: w / 2,
          y: countingY,
          width: w - 100 + 8,
          height: 88,
          color: pulse > 0 ? '#60a5fa' : '#3b82f6',
        }
        drawRectangle(gl, setup, glow)
      }

      const borderColor = totalHere > 0 ? '#93c5fd' : '#60a5fa'
      const borderThickness = 3
      const borderRect: Rectangle = {
        x: w / 2,
        y: countingY,
        width: w - 100,
        height: borderThickness,
        color: borderColor,
      }
      drawRectangle(gl, setup, borderRect)
      borderRect.y = countingY + 77
      drawRectangle(gl, setup, borderRect)
      borderRect.width = borderThickness
      borderRect.height = 80
      borderRect.x = 50
      borderRect.y = countingY
      drawRectangle(gl, setup, borderRect)
      borderRect.x = w - 50
      drawRectangle(gl, setup, borderRect)

      // Particles (update and draw)
      const parts = particlesRef.current
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx * dt * 60
        p.y += p.vy * dt * 60
        p.life -= dt * 2
        if (p.life <= 0) {
          parts.splice(i, 1)
          continue
        }
        const lifeRatio = p.life / p.maxLife
        drawCircle(gl, setup, {
          x: p.x,
          y: p.y,
          radius: p.radius * lifeRatio,
          color: p.color,
        })
      }

      // Currency items – coins shimmer, notes papery, drag scale
      const shimmer = Math.sin(t * 2.5) * 4
      items.forEach((item) => {
        const isSelected = selected === item.id
        const scale = isSelected ? 1.12 : 1

        if (item.type === 'coin' && item.radius) {
          const baseColor = isSelected ? '#ff8800' : item.color
          const highlightColor = isSelected ? '#ffaa44' : '#e8e8e8'
          const r = item.radius * scale
          drawCircle(gl, setup, { x: item.x, y: item.y, radius: r, color: baseColor })
          drawCircle(gl, setup, {
            x: item.x - r * 0.35 + shimmer,
            y: item.y - r * 0.35 - shimmer * 0.5,
            radius: r * 0.45,
            color: highlightColor,
          })
        } else if (item.type === 'bill' && item.width && item.height) {
          const noteColor = isSelected ? '#ff8800' : item.color
          const tilt = (item.value % 3 - 1) * 0.03
          const nw = item.width * scale
          const nh = item.height * scale
          drawRoundedRectangle(gl, setup, {
            x: item.x + 3,
            y: item.y + 3,
            width: nw,
            height: nh,
            color: '#1a1a1a',
            cornerRadius: 8,
          })
          drawRoundedRectangle(gl, setup, {
            x: item.x,
            y: item.y,
            width: nw,
            height: nh,
            color: noteColor,
            cornerRadius: 8,
            rotation: tilt,
          })
        }
      })
    }

    const loop = (time: number) => {
      render(time)
      animationRef.current = requestAnimationFrame(loop)
    }

    handleResize()
    animationRef.current = requestAnimationFrame(loop)

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(canvas)
    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current)
      animationRef.current = null
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [])

  const goToNextChallenge = useCallback(() => {
    lastWonGoalRef.current = null
    setPlacedItems([])
    displayTotalRef.current = 0
    lastDisplayRef.current = 0
    setDisplayTotal(0)
    setCelebration(false)
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current)
      celebrationTimeoutRef.current = null
    }
    setChallengeIndex((i) => {
      if (i >= challenges.length - 1) {
        setAllDone(true)
        return i
      }
      return i + 1
    })
  }, [challenges.length])

  // Calculate total value (placed items in counting area) + goal celebration
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const h = canvas.height
    const itemsInArea = placedItems.filter((item) => isInCountingArea(item, h))
    const total = itemsInArea.reduce((sum, item) => sum + item.value, 0)
    setTotalValue(total)
    if (total === goal && goal > 0 && lastWonGoalRef.current !== goal) {
      lastWonGoalRef.current = goal
      setCelebration(true)
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current)
      celebrationTimeoutRef.current = setTimeout(() => {
        goToNextChallenge()
        celebrationTimeoutRef.current = null
      }, 2500)
    }
  }, [placedItems, goal, goToNextChallenge])

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const palette = getPaletteItems(canvas.width)
    const all = [...palette, ...placedItems]
    let found = false

    const hit = (item: CurrencyItem) => {
      if (item.type === 'coin' && item.radius) {
        return isPointInCircle(x, y, { x: item.x, y: item.y, radius: item.radius, color: item.color })
      }
      if (item.type === 'bill' && item.width && item.height) {
        const tilt = (item.value % 3 - 1) * 0.03
        return isPointInRectangle(x, y, { x: item.x, y: item.y, width: item.width, height: item.height, color: item.color, rotation: tilt })
      }
      return false
    }

    // Hit placed items first (top-most)
    for (let i = placedItems.length - 1; i >= 0; i--) {
      const item = placedItems[i]
      if (hit(item)) {
        setSelectedItem(item.id)
        setDragOffset({ x: x - item.x, y: y - item.y })
        found = true
        break
      }
    }
    if (found) return

    // Then palette: duplicate and start dragging the copy
    for (let i = palette.length - 1; i >= 0; i--) {
      const item = palette[i]
      if (hit(item)) {
        const template = BANGLADESH_CURRENCY.find((c) => item.id === `palette-${c.id}`) ?? BANGLADESH_CURRENCY[i]
        const dup = createDuplicate(template, x, y)
        setPlacedItems((prev) => [...prev, dup])
        setSelectedItem(dup.id)
        setDragOffset({ x: 0, y: 0 })
        found = true
        break
      }
    }

    if (!found) {
      setSelectedItem(null)
      setDragOffset(null)
    }
  }, [placedItems])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!selectedItem || !dragOffset) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (!selectedItem.startsWith('placed-')) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const newX = x - dragOffset.x
    const newY = y - dragOffset.y

    setPlacedItems((items) =>
      items.map((item) =>
        item.id === selectedItem
          ? { ...item, x: Math.max(0, Math.min(newX, canvas.width)), y: Math.max(0, Math.min(newY, canvas.height)) }
          : item
      )
    )
  }, [selectedItem, dragOffset])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    handlePointerDown(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      cursorRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        inside: true,
      }
    }
    handlePointerMove(e.clientX, e.clientY)
  }

  const handleMouseLeave = () => {
    handleMouseUp()
    cursorRef.current.inside = false
  }

  const handleMouseUp = () => {
    const selected = selectedItem
    const canvas = canvasRef.current
    if (selected && canvas) {
      const item = [...paletteItems, ...placedItems].find((i) => i.id === selected)
      if (item && isPlaced(item) && isInCountingArea(item, canvas.height)) {
        addBurst(particlesRef, item.x, item.y)
      }
    }
    setSelectedItem(null)
    setDragOffset(null)
  }

  const clearCurrentChallenge = () => {
    setPlacedItems([])
    setTotalValue(0)
    displayTotalRef.current = 0
    lastDisplayRef.current = 0
    setDisplayTotal(0)
    particlesRef.current = []
    setCelebration(false)
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current)
      celebrationTimeoutRef.current = null
    }
  }

  const playAgain = () => {
    setChallenges(generateChallenges())
    setChallengeIndex(0)
    setAllDone(false)
    clearCurrentChallenge()
  }

  const scaleX = canvasSize.displayW / canvasSize.w
  const scaleY = canvasSize.displayH / canvasSize.h

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer touch-none"
          style={{ display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => {
            e.preventDefault()
            if (e.touches.length && canvasRef.current) {
              const t = e.touches[0]
              handlePointerDown(t.clientX, t.clientY)
            }
          }}
          onTouchMove={(e) => {
            e.preventDefault()
            if (e.touches.length && canvasRef.current) {
              const t = e.touches[0]
              const canvas = canvasRef.current
              const rect = canvas.getBoundingClientRect()
              const scaleX = canvas.width / rect.width
              const scaleY = canvas.height / rect.height
              cursorRef.current = { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY, inside: true }
              handlePointerMove(t.clientX, t.clientY)
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            cursorRef.current.inside = false
            handleMouseUp()
          }}
        />

        {/* Value labels overlay – numbers on each currency */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ left: 0, top: 0, right: 0, bottom: 0 }}
        >
          {allItems.map((item) => (
            <div
              key={item.id}
              className="absolute flex items-center justify-center font-bold text-gray-900 select-none"
              style={{
                left: item.x * scaleX,
                top: item.y * scaleY,
                transform: 'translate(-50%, -50%)',
                fontSize: item.type === 'coin' ? (item.radius && item.radius > 30 ? 14 : item.radius && item.radius > 26 ? 12 : 10) : 11,
                minWidth: item.type === 'bill' ? 28 : 20,
                textShadow: item.type === 'coin' ? '0 0 1px rgba(255,255,255,0.8)' : '0 1px 0 rgba(255,255,255,0.4)',
                color: item.type === 'coin' ? '#333' : (item.value >= 500 ? '#fff' : '#1a1a1a'),
              }}
            >
              {item.value}৳
            </div>
          ))}
        </div>
        
        {/* Info button - top right */}
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-lg flex items-center justify-center border border-gray-600 shadow-lg transition-colors"
          aria-label="Show instructions"
        >
          i
        </button>

        {/* Instructions modal */}
        {showInstructions && (
          <>
            <div
              className="absolute inset-0 bg-black/60 z-10"
              onClick={() => setShowInstructions(false)}
              aria-hidden
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-sm bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-5">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-100 text-lg">💰 Money Counting</h4>
                <button
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                Tap and drag from the display at the top to duplicate coins and notes, then drop them in the counting area to reach the goal.
              </p>
              <div className="text-xs text-gray-400 space-y-2">
                <p className="font-medium text-gray-300">Bangladesh currency:</p>
                <p>• Coins (silver): 1৳, 2৳, 5৳</p>
                <p>• Notes: 10৳ (red), 20৳ (green), 50৳ (orange), 100৳ (blue), 200৳ (yellow), 500৳ (green), 1000৳ (gray)</p>
              </div>
            </div>
          </>
        )}

        {/* Header: challenge (left), tap & drag tip (center), i (right) – all in top space, no overlay on currencies */}
        <div className="absolute top-4 left-4 bg-gray-800/90 rounded-lg px-4 py-2 border border-amber-500/50 shadow-lg z-10">
          <span className="text-amber-400 font-bold text-sm">
            🎯 Challenge {challengeIndex + 1} of {challenges.length}: Make {goal}৳!
          </span>
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-center">
          <span className="text-xs font-medium text-gray-400 bg-gray-800/70 rounded px-3 py-1.5 border border-gray-600/50">Tap & drag from here to add money</span>
        </div>

        {/* All done overlay */}
        {allDone && !celebration && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-2xl px-8 py-6 shadow-2xl border border-amber-500/50 text-center max-w-sm">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-xl font-bold text-gray-100 mb-2">All challenges complete!</div>
              <p className="text-sm text-gray-400 mb-4">You finished all {challenges.length} challenges. Play again for new goals.</p>
              <button
                type="button"
                onClick={playAgain}
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Play again
              </button>
            </div>
          </div>
        )}

        {/* Celebration overlay */}
        {celebration && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 animate-pulse">
            <div className="bg-amber-400/90 text-gray-900 rounded-2xl px-8 py-6 shadow-2xl border-4 border-amber-300 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-2xl font-black">Well done!</div>
              <div className="text-lg font-bold">You made {goal}৳!</div>
              <div className="text-sm mt-1 opacity-90">Next challenge in a moment…</div>
            </div>
          </div>
        )}

        {/* Total display - dark themed, smooth count */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white rounded-full px-8 py-4 shadow-lg border border-primary-500/50">
          <div className="text-center">
            <div className="text-sm font-semibold opacity-90">Total Value</div>
            <div className="text-3xl font-bold">{displayTotal} Taka</div>
          </div>
        </div>
      </div>

      {/* Control panel - dark themed */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              <span className="font-semibold">Items in counting area:</span>{' '}
              {placedItems.filter((item) => isInCountingArea(item, canvasSize.h)).length}
            </div>
          </div>
          <button
            onClick={clearCurrentChallenge}
            className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors border border-gray-500"
          >
            Clear & try again
          </button>
        </div>
      </div>
    </div>
  )
}

