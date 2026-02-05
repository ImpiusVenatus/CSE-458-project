'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, drawRoundedRectangle } from '@/lib/webgl-shapes'

type FallingCoin = {
  id: string
  x: number
  y: number
  vy: number
  value: number
  r: number
  wobble: number
}

type Sparkle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  r: number
  color: string
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]

function formatTaka(n: number) {
  return `${n}৳`
}

function levelFromSavings(savings: number) {
  return Math.floor(savings / 100)
}

export default function SavingsVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // ====== GAME STATE (React) ======
  const [savings, setSavings] = useState(0)
  const [spent, setSpent] = useState(0)

  const [roundActive, setRoundActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [roundCoins, setRoundCoins] = useState(0) // UI display only

  // visible “levels” (good for kids)
  const piggyLevel = useMemo(() => levelFromSavings(savings), [savings])

  // ✅ smooth growth so the tree visibly grows on every save
  // tweak divisor to control growth speed: smaller = faster growth
  const treeGrow = useMemo(() => savings / 150, [savings])

  // ====== REFS (authoritative values for RAF loop) ======
  const roundActiveRef = useRef(false)
  const timeLeftRef = useRef(0)
  const roundCoinsRef = useRef(0)
  const piggyLevelRef = useRef(0)
  const treeGrowRef = useRef(0)

  useEffect(() => {
    roundActiveRef.current = roundActive
  }, [roundActive])
  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])
  useEffect(() => {
    piggyLevelRef.current = piggyLevel
  }, [piggyLevel])
  useEffect(() => {
    treeGrowRef.current = treeGrow
  }, [treeGrow])

  // keep UI display in sync when round starts/ends
  useEffect(() => {
    setRoundCoins(roundCoinsRef.current)
  }, [roundActive])

  // ====== WEBGL / SIMULATION REFS ======
  const coinsRef = useRef<FallingCoin[]>([])
  const sparklesRef = useRef<Sparkle[]>([])
  const bumpRef = useRef({ piggy: 0, tree: 0 })
  const lastTimeRef = useRef<number>(0)

  // piggy movement
  const piggyTargetXRef = useRef<number>(-1)
  const piggyXRef = useRef<number>(-1)

  // ====== ROUND CONTROL ======
  const START_SECONDS = 18

  const startRound = () => {
    if (roundActiveRef.current) return
    roundCoinsRef.current = 0
    setRoundCoins(0)
    setTimeLeft(START_SECONDS)
    setRoundActive(true)
  }

  const endRound = () => {
    setRoundActive(false)
    setTimeLeft(0)
  }

  // countdown
  useEffect(() => {
    if (!roundActive) return
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        const nt = t - 1
        if (nt <= 0) {
          setTimeout(endRound, 0)
          return 0
        }
        return nt
      })
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundActive])

  const doSave = () => {
    if (roundActiveRef.current) return
    const earned = roundCoinsRef.current
    if (earned <= 0) return
    setSavings((s) => s + earned)
    bumpRef.current.piggy = 1
    bumpRef.current.tree = 1
    roundCoinsRef.current = 0
    setRoundCoins(0)
  }

  const doSpend = () => {
    if (roundActiveRef.current) return
    const earned = roundCoinsRef.current
    if (earned <= 0) return
    setSpent((s) => s + earned)
    bumpRef.current.piggy = 1
    roundCoinsRef.current = 0
    setRoundCoins(0)
  }

  const resetAll = () => {
    setSavings(0)
    setSpent(0)
    setRoundActive(false)
    setTimeLeft(0)
    roundCoinsRef.current = 0
    setRoundCoins(0)
    coinsRef.current = []
    sparklesRef.current = []
    bumpRef.current = { piggy: 0, tree: 0 }
  }

  // ====== INPUT ======
  const setPiggyTargetFromClient = (clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const w = rect.width

    // ✅ full canvas movement with margins
    const margin = 44
    const clamped = clamp(x, margin, w - margin)
    piggyTargetXRef.current = (clamped / w) * canvas.width
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!roundActiveRef.current) return
    setPiggyTargetFromClient(e.clientX)
  }

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!roundActiveRef.current) return
    if (!e.touches.length) return
    e.preventDefault()
    setPiggyTargetFromClient(e.touches[0].clientX)
  }

  // ====== WEBGL LOOP (run ONCE, use refs inside) ======
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
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, canvas.width, canvas.height)

      // keep piggy within bounds after resize
      const w = canvas.width
      if (piggyXRef.current < 0) piggyXRef.current = w * 0.5
      if (piggyTargetXRef.current < 0) piggyTargetXRef.current = w * 0.5
      piggyXRef.current = clamp(piggyXRef.current, 44, w - 44)
      piggyTargetXRef.current = clamp(piggyTargetXRef.current, 44, w - 44)
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    // init piggy x
    piggyXRef.current = canvas.width * 0.5
    piggyTargetXRef.current = canvas.width * 0.5

    const spawnCoin = (w: number) => {
      const val = pick([1, 2, 5, 10, 20] as const)
      const r = val <= 5 ? 10 : 12
      coinsRef.current.push({
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: rand(40, w - 40),
        y: -30,
        vy: rand(150, 240),
        value: val,
        r,
        wobble: rand(0, Math.PI * 2),
      })
    }

    const addSpark = (x: number, y: number) => {
      const palette = ['#fde047', '#facc15', '#fff7b3', '#ffffff']
      for (let i = 0; i < 10; i++) {
        const a = rand(0, Math.PI * 2)
        const sp = rand(95, 190)
        sparklesRef.current.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: rand(0.45, 0.75),
          maxLife: 1,
          r: rand(2.5, 5),
          color: palette[i % palette.length],
        })
      }
    }

    // ✅ nicer piggy (still simple shapes)
    const drawPiggy = (x: number, baseY: number, level: number, t: number) => {
      const grow = clamp(level, 0, 12)
      const bob = Math.sin(t * 3.0) * 1.0

      const bump = bumpRef.current.piggy
      bumpRef.current.piggy = Math.max(0, bump - 0.06)
      const s = 1 + bump * 0.08

      const bodyColor = level >= 5 ? '#ff4fa3' : '#ff86c7'
      const cheek = 'rgba(255,255,255,0.12)'

      const bodyR = (44 + grow * 2.8) * s

      // shadow
      drawCircle(gl, setup, { x: x + 10, y: baseY + 18, radius: bodyR * 0.95, color: 'rgba(0,0,0,0.16)' })

      // body + head
      drawCircle(gl, setup, { x, y: baseY - 26 + bob, radius: bodyR, color: bodyColor })
      drawCircle(gl, setup, { x: x + bodyR * 0.55, y: baseY - 46 + bob, radius: bodyR * 0.62, color: bodyColor })

      // cheeks highlight
      drawCircle(gl, setup, { x: x - bodyR * 0.25, y: baseY - 44 + bob, radius: bodyR * 0.55, color: cheek })

      // ear
      drawCircle(gl, setup, { x: x + bodyR * 0.18, y: baseY - bodyR * 1.25 + bob, radius: 12, color: bodyColor })
      drawCircle(gl, setup, { x: x + bodyR * 0.30, y: baseY - bodyR * 1.18 + bob, radius: 9, color: 'rgba(255,255,255,0.10)' })

      // snout
      drawCircle(gl, setup, { x: x + bodyR * 1.12, y: baseY - 44 + bob, radius: 14, color: '#ffb3d9' })
      drawCircle(gl, setup, { x: x + bodyR * 1.06, y: baseY - 44 + bob, radius: 3.5, color: 'rgba(0,0,0,0.25)' })
      drawCircle(gl, setup, { x: x + bodyR * 1.18, y: baseY - 44 + bob, radius: 3.5, color: 'rgba(0,0,0,0.25)' })

      // eye
      drawCircle(gl, setup, { x: x + bodyR * 0.66, y: baseY - 64 + bob, radius: 4.8, color: 'rgba(0,0,0,0.55)' })
      drawCircle(gl, setup, { x: x + bodyR * 0.62, y: baseY - 68 + bob, radius: 2.0, color: 'rgba(255,255,255,0.9)' })

      // legs
      const legY = baseY + 8
      drawRoundedRectangle(gl, setup, { x: x - 18, y: legY, width: 14, height: 22, color: bodyColor, cornerRadius: 8 })
      drawRoundedRectangle(gl, setup, { x: x + 18, y: legY, width: 14, height: 22, color: bodyColor, cornerRadius: 8 })

      // tail curl
      drawCircle(gl, setup, { x: x - bodyR * 0.95, y: baseY - 30 + bob, radius: 9, color: bodyColor })
      drawCircle(gl, setup, { x: x - bodyR * 1.05, y: baseY - 30 + bob, radius: 5, color: 'rgba(255,255,255,0.12)' })

      // coin slot
      drawRoundedRectangle(gl, setup, {
        x: x + bodyR * 0.10,
        y: baseY - bodyR * 0.95 + bob,
        width: bodyR * 0.75,
        height: 8,
        color: 'rgba(0,0,0,0.22)',
        cornerRadius: 6,
      })
    }

    // ✅ smooth growing tree (growAmount is float, not just levels)
    const drawTree = (x: number, baseY: number, growAmount: number, t: number) => {
      const grow = clamp(growAmount, 0, 12)

      const bump = bumpRef.current.tree
      bumpRef.current.tree = Math.max(0, bump - 0.05)
      const s = 1 + bump * 0.10

      const trunkH = (78 + grow * 18) * s
      const trunkW = 26 + grow * 1.1
      const sway = Math.sin(t * 1.2) * (2 + grow * 0.12)

      drawRoundedRectangle(gl, setup, {
        x: x + sway * 0.2,
        y: baseY - trunkH / 2,
        width: trunkW,
        height: trunkH,
        color: '#8b4513',
        cornerRadius: 14,
      })

      // trunk highlight
      drawRoundedRectangle(gl, setup, {
        x: x + trunkW * 0.10,
        y: baseY - trunkH / 2,
        width: trunkW * 0.22,
        height: trunkH * 0.78,
        color: 'rgba(255,255,255,0.08)',
        cornerRadius: 10,
      })

      const leafBase = baseY - trunkH - 14
      const crown = (62 + grow * 16) * s

      drawCircle(gl, setup, { x: x - 26 + sway, y: leafBase + 8, radius: crown * 0.42, color: '#34c759' })
      drawCircle(gl, setup, { x: x + sway * 0.3, y: leafBase - 10, radius: crown * 0.52, color: '#66bb6a' })
      drawCircle(gl, setup, { x: x + 30 + sway * 0.7, y: leafBase + 10, radius: crown * 0.40, color: '#2ea44f' })

      // fruit appears earlier so kids feel reward
      if (grow >= 1.5) {
        const fruitCount = Math.min(8, Math.floor(grow * 1.4))
        for (let i = 0; i < fruitCount; i++) {
          drawCircle(gl, setup, {
            x: x + rand(-38, 38) + sway * 0.6,
            y: leafBase + rand(-10, 30),
            radius: 5.2,
            color: '#ff4d6d',
          })
          drawCircle(gl, setup, {
            x: x + rand(-38, 38) + sway * 0.6 - 1.6,
            y: leafBase + rand(-10, 30) - 1.6,
            radius: 2.1,
            color: 'rgba(255,255,255,0.55)',
          })
        }
      }
    }

    const drawCoin = (c: FallingCoin, t: number) => {
      const wob = Math.sin(t * 6 + c.wobble) * 1.6
      drawCircle(gl, setup, { x: c.x + 4, y: c.y + 5, radius: c.r * 0.95, color: 'rgba(0,0,0,0.18)' })
      drawCircle(gl, setup, { x: c.x, y: c.y, radius: c.r, color: '#f59e0b' })
      drawCircle(gl, setup, { x: c.x, y: c.y, radius: c.r * 0.82, color: '#fde047' })
      drawCircle(gl, setup, { x: c.x - c.r * 0.28 + wob, y: c.y - c.r * 0.30, radius: c.r * 0.22, color: 'rgba(255,255,255,0.75)' })
    }

    const drawSparkles = (dt: number) => {
      const sps = sparklesRef.current
      for (let i = sps.length - 1; i >= 0; i--) {
        const s = sps[i]
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vx *= 0.985
        s.vy *= 0.985
        s.life -= dt * 1.8
        if (s.life <= 0) {
          sps.splice(i, 1)
          continue
        }
        const a = clamp(s.life / s.maxLife, 0, 1)
        drawCircle(gl, setup, { x: s.x, y: s.y, radius: s.r * a, color: s.color })
      }
    }

    const render = (now: number) => {
      const w = canvas.width
      const h = canvas.height

      const last = lastTimeRef.current || now
      const dt = Math.min(0.05, (now - last) / 1000)
      lastTimeRef.current = now
      const t = now / 1000

      // background
      gl.clearColor(0.72, 0.88, 1.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // ground
      const groundY = h - 58
      drawRectangle(gl, setup, { x: w / 2, y: groundY + 35, width: w, height: 70, color: '#8b7355' })
      drawRectangle(gl, setup, { x: w / 2, y: groundY + 5, width: w, height: 18, color: '#7cb342' })

      // piggy smoothing
      if (piggyTargetXRef.current < 0) piggyTargetXRef.current = w * 0.5
      if (piggyXRef.current < 0) piggyXRef.current = w * 0.5

      piggyTargetXRef.current = clamp(piggyTargetXRef.current, 44, w - 44)
      piggyXRef.current = clamp(piggyXRef.current, 44, w - 44)

      piggyXRef.current = lerp(piggyXRef.current, piggyTargetXRef.current, 0.18)
      const piggyX = piggyXRef.current

      const piggyBaseY = groundY - 16
      const treeX = w * 0.82
      const treeBaseY = groundY + 4

      drawPiggy(piggyX, piggyBaseY, piggyLevelRef.current, t)
      drawTree(treeX, treeBaseY, treeGrowRef.current, t)

      // spawn coins only during round
      if (roundActiveRef.current) {
        const spawnChance = 0.04
        if (Math.random() < spawnChance) spawnCoin(w)
      }

      // simulate & catch
      const coins = coinsRef.current
      let caughtThisFrame = 0

      // collision anchor tuned to piggy
      const catchX = piggyX + 30
      const catchY = piggyBaseY - 60
      const catchRadius = 78 // generous for kids

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]
        c.y += c.vy * dt
        c.x += Math.sin(t * 2 + c.wobble) * dt * 22

        const dx = c.x - catchX
        const dy = c.y - catchY
        const rr = catchRadius * catchRadius

        if (dx * dx + dy * dy < rr) {
          caughtThisFrame += c.value
          coins.splice(i, 1)
          bumpRef.current.piggy = 1
          addSpark(c.x, c.y)
          continue
        }

        if (c.y > groundY + 10) coins.splice(i, 1)
      }

      if (caughtThisFrame > 0) {
        roundCoinsRef.current += caughtThisFrame
        setRoundCoins(roundCoinsRef.current)
      }

      // draw coins
      for (const c of coins) drawCoin(c, t)

      // sparkles
      drawSparkles(dt)

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // ====== CLEAN UI (top-left, not interfering) ======
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          style={{ display: 'block' }}
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
        />

        {/* Top-left compact actions + HUD */}
        <div className="absolute top-4 left-4 z-20 pointer-events-auto">
          <div className="bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg p-3 w-[320px]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-gray-900">🌱 Savings Game</div>
              <div className="text-xs font-bold text-gray-700">⏱️ {timeLeft}s</div>
            </div>

            <div className="mt-2 flex items-center gap-3 text-sm font-bold text-gray-900">
              <span className="rounded-xl bg-amber-100 px-2.5 py-1">🪙 {formatTaka(roundCoins)}</span>
              <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-emerald-800">Saved {formatTaka(savings)}</span>
              <span className="rounded-xl bg-pink-100 px-2.5 py-1 text-pink-800">Spent {formatTaka(spent)}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={startRound}
                disabled={roundActive}
                className={`rounded-xl px-4 py-2.5 font-bold transition ${
                  roundActive ? 'bg-gray-200 text-gray-500' : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {roundActive ? 'Playing...' : 'Start'}
              </button>

              <button
                onClick={resetAll}
                className="rounded-xl px-4 py-2.5 font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
              >
                Reset
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={doSave}
                disabled={roundActive || roundCoins <= 0}
                className={`rounded-xl px-4 py-2.5 font-bold transition ${
                  roundActive || roundCoins <= 0
                    ? 'bg-gray-200 text-gray-500'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                Save 🌱
              </button>

              <button
                onClick={doSpend}
                disabled={roundActive || roundCoins <= 0}
                className={`rounded-xl px-4 py-2.5 font-bold transition ${
                  roundActive || roundCoins <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-pink-600 hover:bg-pink-500 text-white'
                }`}
              >
                Spend 🎉
              </button>
            </div>

            <div className="mt-2 text-[11px] text-gray-600">
              Save makes the tree grow every time 🌳
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
