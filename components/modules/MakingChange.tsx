'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import {
  drawCircle,
  drawRectangle,
  drawRoundedRectangle,
  getCanvasCoordinates,
  isPointInRectangle,
  Rectangle,
} from '@/lib/webgl-shapes'
import { useProgress } from '@/lib/progress-context'
import { recordMakingChangeTransaction } from '@/lib/progress'

type Denom = 1 | 2 | 5 | 10 | 20 | 50 | 100 | 200 | 500
type CashStock = Record<Denom, number>
type Toast = { title: string; desc?: string; tone?: 'good' | 'warn' | 'info' }

type ShopItem = {
  id: string
  name: string
  price: number
  color: string
  x: number
  y: number
}

type FlyingToken = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  maxLife: number
  color: string
  stroke?: string
  kind: 'pay' | 'change'
}

const DENOMS: Denom[] = [500, 200, 100, 50, 20, 10, 5, 2, 1]

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]

function taka(n: number) {
  return `${n}৳`
}

function sumStock(stock: CashStock) {
  return DENOMS.reduce((s, d) => s + d * (stock[d] || 0), 0)
}

function cloneStock(s: CashStock): CashStock {
  return { ...s }
}

function paymentTotal(payment: Partial<CashStock>) {
  let s = 0
  for (const d of DENOMS) s += (payment[d] || 0) * d
  return s
}

function normalizePayment(payment: Partial<CashStock>) {
  const p: Partial<CashStock> = {}
  for (const d of DENOMS) {
    const c = payment[d]
    if (c && c > 0) p[d] = c
  }
  return p
}

// Greedy with limited stock (works fine for this denom set)
function makeChangeGreedy(change: number, stock: CashStock) {
  const give: Partial<CashStock> = {}
  let remaining = change
  for (const d of DENOMS) {
    if (remaining <= 0) break
    const need = Math.floor(remaining / d)
    if (need <= 0) continue
    const have = stock[d] || 0
    const use = Math.min(need, have)
    if (use > 0) {
      give[d] = use
      remaining -= use * d
    }
  }
  return { ok: remaining === 0, give, remaining }
}

function applyDelta(stock: CashStock, delta: Partial<CashStock>, sign: 1 | -1) {
  const next = cloneStock(stock)
  for (const d of DENOMS) {
    const k = delta[d]
    if (!k) continue
    next[d] = (next[d] || 0) + sign * k
  }
  return next
}

function generateCustomerPayment(price: number): Partial<CashStock> {
  const extraOptions = [0, 0, 0, 1, 2, 5, 10, 20, 50, 100]
  let target = price + pick(extraOptions)
  if (target < price) target = price

  const p: Partial<CashStock> = {}
  let remaining = target

  for (const d of DENOMS) {
    if (remaining <= 0) break
    const max = Math.floor(remaining / d)
    if (max <= 0) continue

    // encourage at least some larger bills sometimes
    const roll = Math.random()
    const use =
      d >= 100
        ? roll < 0.55
          ? Math.min(max, 1)
          : 0
        : d >= 20
          ? roll < 0.45
            ? Math.min(max, 1)
            : 0
          : Math.floor(rand(0, max + 1))

    if (use > 0) {
      p[d] = (p[d] || 0) + use
      remaining -= use * d
    }
  }

  if (remaining > 0) {
    p[1] = (p[1] || 0) + remaining
  }

  if (paymentTotal(p) < price) {
    const diff = price - paymentTotal(p)
    p[1] = (p[1] || 0) + diff
  }

  return normalizePayment(p)
}

function denomLabel(d: Denom) {
  return d >= 50 ? `${d}৳ note` : `${d}৳ coin`
}

export default function MakingChangeGame() {
  const { userId } = useProgress()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  // ====== UI state
  const [toast, setToast] = useState<Toast | null>(null)

  const [stock, setStock] = useState<CashStock>({
    1: 10,
    2: 8,
    5: 7,
    10: 7,
    20: 5,
    50: 3,
    100: 2,
    200: 1,
    500: 0,
  })

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const [customer, setCustomer] = useState<{
    item: ShopItem | null
    payment: Partial<CashStock>
    payTotal: number
    changeDue: number
    status: 'idle' | 'waiting' | 'served' | 'denied'
  }>({
    item: null,
    payment: {},
    payTotal: 0,
    changeDue: 0,
    status: 'idle',
  })

  const [given, setGiven] = useState<Partial<CashStock>>({})
  const [customerHintUsed, setCustomerHintUsed] = useState(false)

  const stockValue = useMemo(() => sumStock(stock), [stock])
  const totalGiven = useMemo(() => paymentTotal(given), [given])
  const remainingDue = useMemo(() => {
    if (customer.status !== 'waiting') return 0
    return Math.max(0, customer.changeDue - totalGiven)
  }, [customer, totalGiven])

  const canServeNow = useMemo(() => {
    if (customer.status !== 'waiting') return false
    return totalGiven === customer.changeDue
  }, [customer, totalGiven])

  const canAffordGivenFromStock = useMemo(() => {
    for (const d of DENOMS) {
      const g = given[d] || 0
      if (g > (stock[d] || 0)) return false
    }
    return true
  }, [given, stock])

  // ====== WebGL refs
  const itemsRef = useRef<ShopItem[]>([])
  const tokensRef = useRef<FlyingToken[]>([])
  const lastTimeRef = useRef<number>(0)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (t: Toast) => {
    setToast(t)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1600)
  }

  // ====== customer flow
  const spawnCustomer = () => {
    const items = itemsRef.current
    if (!items.length) return

    const item = pick(items)
    const payment = generateCustomerPayment(item.price)
    const payTotal = paymentTotal(payment)
    const changeDue = payTotal - item.price

    setCustomer({ item, payment, payTotal, changeDue, status: 'waiting' })
    setGiven({})
    setCustomerHintUsed(false)
    setSelectedItemId(item.id)
    showToast({ title: 'New customer!', desc: `${item.name} • ${taka(item.price)}`, tone: 'info' })
  }

  const denyCustomer = () => {
    if (customer.status !== 'waiting' || !customer.item) return
    recordMakingChangeTransaction(userId, {
      itemName: customer.item.name,
      price: customer.item.price,
      payTotal: customer.payTotal,
      changeDue: customer.changeDue,
      status: 'denied',
      usedHint: customerHintUsed,
    })
    setCustomer((c) => ({ ...c, status: 'denied' }))
    setGiven({})
    setCustomerHintUsed(false)
    setSelectedItemId(null)
    showToast({ title: 'Denied', desc: 'No sale. Customer leaves.', tone: 'warn' })
  }

  const nextCustomer = () => {
    if (customer.status === 'waiting') {
      showToast({ title: 'Finish first', desc: 'Serve or Deny this customer.', tone: 'warn' })
      return
    }
    spawnCustomer()
  }

  const autoMakeChange = () => {
    if (customer.status !== 'waiting') return
    setCustomerHintUsed(true)
    const due = customer.changeDue
    if (due <= 0) {
      setGiven({})
      showToast({ title: 'Exact payment!', desc: 'No change needed 🙂', tone: 'good' })
      return
    }
    const { ok, give } = makeChangeGreedy(due, stock)
    if (!ok) {
      showToast({ title: "Can't make change", desc: 'You do not have the right coins/notes.', tone: 'warn' })
      return
    }
    setGiven(give)
    showToast({ title: 'Hint ready', desc: 'Now Serve ✅', tone: 'info' })
  }

  // ====== exchange animation trigger (coins/notes flying)
  const triggerExchangeAnimation = (canvas: HTMLCanvasElement, pay: Partial<CashStock>, change: Partial<CashStock>) => {
    const w = canvas.width
    const h = canvas.height

    // anchors inside canvas (match render scene positions)
    const leftAnchor = { x: w * 0.22, y: h * 0.62 }
    const rightAnchor = { x: w * 0.78, y: h * 0.62 }

    const pushTokenBurst = (kind: 'pay' | 'change', amount: Partial<CashStock>) => {
      // create one token per note/coin count, but cap for performance
      const expanded: Denom[] = []
      for (const d of DENOMS) {
        const c = amount[d] || 0
        for (let i = 0; i < c; i++) expanded.push(d)
      }

      // cap tokens (keep it pretty, not spammy)
      const maxTokens = 18
      while (expanded.length > maxTokens) expanded.splice(Math.floor(Math.random() * expanded.length), 1)

      for (const d of expanded) {
        const isNote = d >= 50
        const r = isNote ? 10 : 7

        const start = kind === 'pay' ? leftAnchor : rightAnchor
        const end = kind === 'pay' ? rightAnchor : leftAnchor

        // randomize start a bit
        const sx = start.x + rand(-14, 14)
        const sy = start.y + rand(-18, 18)

        // aim velocity towards end with a little arc
        const dx = end.x - sx
        const dy = end.y - sy
        const dist = Math.max(180, Math.hypot(dx, dy))

        const speed = rand(220, 320)
        const vx = (dx / dist) * speed
        const vy = (dy / dist) * speed - rand(30, 80) // arc up a bit

        const color =
          kind === 'pay'
            ? isNote
              ? '#60a5fa' // blue note
              : '#34d399' // green coin
            : isNote
              ? '#fbbf24' // gold-ish note
              : '#f59e0b' // coin

        const stroke = isNote ? '#0f172a' : undefined

        tokensRef.current.push({
          x: sx,
          y: sy,
          vx,
          vy,
          r,
          life: 0.9,
          maxLife: 0.9,
          color,
          stroke,
          kind,
        })
      }
    }

    pushTokenBurst('pay', pay)
    pushTokenBurst('change', change)
  }

  const serveCustomer = () => {
    if (customer.status !== 'waiting' || !customer.item) return

    const due = customer.changeDue

    if (totalGiven !== due) {
      showToast({ title: 'Not correct yet', desc: `Remaining: ${taka(Math.max(0, due - totalGiven))}`, tone: 'warn' })
      return
    }
    if (!canAffordGivenFromStock) {
      showToast({ title: 'Not enough stock', desc: 'You tried to give more than you have.', tone: 'warn' })
      return
    }

    // apply stock updates
    const stockAfterPay = applyDelta(stock, customer.payment, +1)
    const stockAfterGive = applyDelta(stockAfterPay, given, -1)

    // animate exchange in canvas
    const canvas = canvasRef.current
    if (canvas) triggerExchangeAnimation(canvas, customer.payment, given)

    recordMakingChangeTransaction(userId, {
      itemName: customer.item.name,
      price: customer.item.price,
      payTotal: customer.payTotal,
      changeDue: customer.changeDue,
      status: 'served',
      usedHint: customerHintUsed,
    })
    setStock(stockAfterGive)
    setCustomer((c) => ({ ...c, status: 'served' }))
    setCustomerHintUsed(false)
    setSelectedItemId(null)
    showToast({ title: 'Served!', desc: 'Great job ✅', tone: 'good' })

    setTimeout(() => {
      setCustomer({ item: null, payment: {}, payTotal: 0, changeDue: 0, status: 'idle' })
      setGiven({})
    }, 900)
  }

  const resetAll = () => {
    setStock({
      1: 10,
      2: 8,
      5: 7,
      10: 7,
      20: 5,
      50: 3,
      100: 2,
      200: 1,
      500: 0,
    })
    setGiven({})
    setCustomerHintUsed(false)
    setCustomer({ item: null, payment: {}, payTotal: 0, changeDue: 0, status: 'idle' })
    setSelectedItemId(null)
    tokensRef.current = []
    showToast({ title: 'Reset', desc: 'Back to starting stock.', tone: 'info' })
  }

  // ====== denom controls
  const addGive = (d: Denom) => {
    if (customer.status !== 'waiting') return
    if ((stock[d] || 0) <= (given[d] || 0)) {
      showToast({ title: 'Out of that one!', desc: `No more ${denomLabel(d)} left.`, tone: 'warn' })
      return
    }
    setGiven((g) => ({ ...g, [d]: (g[d] || 0) + 1 }))
  }

  const removeGive = (d: Denom) => {
    if (customer.status !== 'waiting') return
    setGiven((g) => {
      const cur = g[d] || 0
      if (cur <= 0) return g
      const next = { ...g }
      next[d] = cur - 1
      if (next[d] === 0) delete next[d]
      return next
    })
  }

  const clearGiven = () => {
    if (customer.status !== 'waiting') return
    setGiven({})
  }

  // ====== start with a customer after canvas lays out
  useEffect(() => {
    const t = setTimeout(() => spawnCustomer(), 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ====== WebGL render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    const { gl } = initWebGL(canvas)
    if (!gl) return

    const setup = setupBasic2D(gl, canvas)
    if (!setup) return

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const layoutItems = () => {
      const w = canvas.width
      const h = canvas.height

      // Centered shelf layout (one area, no empty “bands”)
      const shelfCenterY = h * 0.28
      const cellW = w * 0.18
      const gapX = w * 0.03
      const startX = w / 2 - (cellW * 3 + gapX * 2) / 2 + cellW / 2

      const rowGap = h * 0.14
      const row1Y = shelfCenterY
      const row2Y = shelfCenterY + rowGap

      const base = [
        { id: 'item1', name: 'Toy Car', price: 50, color: '#ff6b6b' },
        { id: 'item2', name: 'Book', price: 30, color: '#4ecdc4' },
        { id: 'item3', name: 'Ball', price: 25, color: '#45b7d1' },
        { id: 'item4', name: 'Puzzle', price: 75, color: '#f9ca24' },
        { id: 'item5', name: 'Crayons', price: 40, color: '#6c5ce7' },
        { id: 'item6', name: 'Doll', price: 100, color: '#fd79a8' },
      ] as const

      const computed: ShopItem[] = base.map((b, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return {
          ...b,
          x: startX + col * (cellW + gapX),
          y: row === 0 ? row1Y : row2Y,
        }
      })

      itemsRef.current = computed
    }

    const handleResize = () => {
      updateCanvasSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (setup.resolutionLocation) gl.uniform2f(setup.resolutionLocation, canvas.width, canvas.height)
      layoutItems()

      // keep customer item synced to new layout
      setCustomer((c) => {
        if (!c.item) return c
        const mapped = itemsRef.current.find((x) => x.id === c.item!.id)
        if (!mapped) return c
        return { ...c, item: mapped }
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    // ====== draw helpers (HEX-only colors to avoid “black” surprises)
    const drawSoftPanel = (x: number, y: number, w: number, h: number, color: string) => {
      // shadow
      drawRoundedRectangle(gl, setup, { x, y: y + 4, width: w, height: h, color: '#0b12201A', cornerRadius: 22 })
      drawRoundedRectangle(gl, setup, { x, y, width: w, height: h, color, cornerRadius: 22 })
      drawRoundedRectangle(gl, setup, { x, y, width: w, height: h, color: '#0b12200F', cornerRadius: 22 })
    }

    const drawCoin = (x: number, y: number, r: number, face: string, rim: string) => {
      drawCircle(gl, setup, { x: x + 2, y: y + 2, radius: r, color: '#0b122024' })
      drawCircle(gl, setup, { x, y, radius: r, color: rim })
      drawCircle(gl, setup, { x, y, radius: r * 0.78, color: face })
      drawCircle(gl, setup, { x: x - r * 0.22, y: y - r * 0.26, radius: r * 0.18, color: '#ffffffB3' })
    }

    const drawNote = (x: number, y: number, w: number, h: number, color: string) => {
      drawRoundedRectangle(gl, setup, { x: x + 2, y: y + 2, width: w, height: h, color: '#0b122024', cornerRadius: 10 })
      drawRoundedRectangle(gl, setup, { x, y, width: w, height: h, color, cornerRadius: 10 })
      drawRoundedRectangle(gl, setup, { x, y, width: w, height: h, color: '#0b122018', cornerRadius: 10 })
      drawCircle(gl, setup, { x, y, radius: Math.min(w, h) * 0.18, color: '#ffffff55' })
    }

    const render = (now: number) => {
      const w = canvas.width
      const h = canvas.height

      const last = lastTimeRef.current || now
      const dt = Math.min(0.05, (now - last) / 1000)
      lastTimeRef.current = now

      // clean background (no huge black empty bars)
      gl.clearColor(0.92, 0.96, 1.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // floor
      const floorY = h * 0.82
      drawRectangle(gl, setup, { x: w / 2, y: floorY + h * 0.10, width: w, height: h * 0.25, color: '#dbeafe' })
      drawRectangle(gl, setup, { x: w / 2, y: floorY + 30, width: w, height: 60, color: '#bae6fd' })

      // centered shop shelf
      const shelfW = w * 0.72
      const shelfH = h * 0.42
      const shelfX = w / 2
      const shelfY = h * 0.30
      drawSoftPanel(shelfX, shelfY, shelfW, shelfH, '#ffffffCC')

      // items on shelf (simple “product tiles”)
      const items = itemsRef.current
      for (const item of items) {
        const isSel = selectedItemId === item.id
        const cardW = w * 0.16
        const cardH = h * 0.09
        drawRoundedRectangle(gl, setup, {
          x: item.x,
          y: item.y,
          width: cardW,
          height: cardH,
          color: isSel ? '#ffedd5' : '#ffffffE6',
          cornerRadius: 18,
        })
        drawRoundedRectangle(gl, setup, {
          x: item.x,
          y: item.y,
          width: cardW,
          height: cardH,
          color: '#0b122010',
          cornerRadius: 18,
        })
        drawCircle(gl, setup, { x: item.x - cardW * 0.32, y: item.y, radius: Math.min(cardW, cardH) * 0.23, color: item.color })
        drawCoin(item.x + cardW * 0.32, item.y + cardH * 0.20, 9, '#fde047', '#f59e0b')
      }

      // counter in the middle (single clean band)
      const counterW = w * 0.72
      const counterH = h * 0.16
      const counterX = w / 2
      const counterY = h * 0.66
      drawSoftPanel(counterX, counterY, counterW, counterH, '#ffffffCC')

      // customer spot (left) + register spot (right) – these explain exchange animation
      const leftAnchor = { x: w * 0.22, y: h * 0.62 }
      const rightAnchor = { x: w * 0.78, y: h * 0.62 }

      // customer avatar (left)
      drawCircle(gl, setup, { x: leftAnchor.x, y: leftAnchor.y, radius: 22, color: '#93c5fd' })
      drawCircle(gl, setup, { x: leftAnchor.x, y: leftAnchor.y - 28, radius: 16, color: '#60a5fa' })
      drawCircle(gl, setup, { x: leftAnchor.x - 6, y: leftAnchor.y - 32, radius: 3, color: '#0b122055' })
      drawCircle(gl, setup, { x: leftAnchor.x + 6, y: leftAnchor.y - 32, radius: 3, color: '#0b122055' })

      // register (right)
      drawRoundedRectangle(gl, setup, { x: rightAnchor.x, y: rightAnchor.y, width: 90, height: 50, color: '#0f172a', cornerRadius: 14 })
      drawRoundedRectangle(gl, setup, { x: rightAnchor.x, y: rightAnchor.y - 12, width: 70, height: 24, color: '#334155', cornerRadius: 12 })
      drawCircle(gl, setup, { x: rightAnchor.x + 26, y: rightAnchor.y + 8, radius: 6, color: '#22c55e' })
      drawCircle(gl, setup, { x: rightAnchor.x + 42, y: rightAnchor.y + 8, radius: 6, color: '#f59e0b' })

      // ---- animate flying tokens (payment → register, change → customer)
      const tokens = tokensRef.current
      for (let i = tokens.length - 1; i >= 0; i--) {
        const p = tokens[i]
        p.life -= dt
        if (p.life <= 0) {
          tokens.splice(i, 1)
          continue
        }

        // gravity-ish + drag
        p.vy += 260 * dt
        p.vx *= 0.985
        p.vy *= 0.985

        p.x += p.vx * dt
        p.y += p.vy * dt

        const a = clamp(p.life / p.maxLife, 0, 1)

        // draw as coin or note-ish based on radius
        if (p.r >= 9.5) {
          drawNote(p.x, p.y, 26 * (0.85 + 0.15 * a), 14 * (0.85 + 0.15 * a), p.color)
        } else {
          // coin
          drawCoin(p.x, p.y, p.r * (0.85 + 0.15 * a), '#fde047', p.color)
        }
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId])

  // ====== canvas click: just highlight items (optional)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)
    const items = itemsRef.current
    const cardW = canvas.width * 0.16
    const cardH = canvas.height * 0.09

    for (const item of items) {
      const r: Rectangle = { x: item.x, y: item.y, width: cardW, height: cardH, color: item.color }
      if (isPointInRectangle(coords.x, coords.y, r)) {
        setSelectedItemId(item.id)
        return
      }
    }
  }

  // ====== UI styles
  const toneStyle = (tone?: Toast['tone']) => {
    if (tone === 'good') return 'bg-emerald-600/90 border-emerald-200 text-emerald-50'
    if (tone === 'warn') return 'bg-amber-600/90 border-amber-200 text-amber-50'
    return 'bg-sky-600/85 border-sky-200 text-sky-50'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          style={{ display: 'block' }}
          onClick={handleCanvasClick}
        />

        {/* Center-aligned left + right panels (no top “floating” clutter) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full w-full flex items-center justify-between px-6">
            {/* LEFT: customer + actions */}
            <div className="pointer-events-auto w-[360px]">
              <div className="bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-gray-900">🛒 Making Change</div>
                  <div className="text-xs font-bold text-gray-700">Stock: {taka(stockValue)}</div>
                </div>

                <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                  {customer.status === 'waiting' && customer.item ? (
                    <div className="text-sm">
                      <div className="font-bold text-gray-900">
                        Customer buys: <span className="text-sky-700">{customer.item.name}</span> ({taka(customer.item.price)})
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Pays: {taka(customer.payTotal)}</span>
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">Change: {taka(customer.changeDue)}</span>
                        <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">Given: {taka(totalGiven)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-700">
                        {remainingDue === 0 ? (
                          <span className="font-bold text-emerald-700">Perfect! Click Serve ✅</span>
                        ) : (
                          <span>
                            Remaining: <span className="font-bold text-amber-700">{taka(remainingDue)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : customer.status === 'served' ? (
                    <div className="text-sm font-bold text-emerald-700">✅ Served! Click “Next Customer”.</div>
                  ) : customer.status === 'denied' ? (
                    <div className="text-sm font-bold text-amber-700">⚠️ Denied. Click “Next Customer”.</div>
                  ) : (
                    <div className="text-sm font-bold text-gray-700">Ready. Click “Next Customer”.</div>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={nextCustomer}
                    className="rounded-xl px-4 py-2.5 font-bold bg-sky-600 hover:bg-sky-500 text-white transition"
                  >
                    Next Customer
                  </button>
                  <button
                    onClick={denyCustomer}
                    disabled={customer.status !== 'waiting'}
                    className={`rounded-xl px-4 py-2.5 font-bold transition ${
                      customer.status !== 'waiting' ? 'bg-gray-200 text-gray-500' : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    Deny Sale
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={autoMakeChange}
                    disabled={customer.status !== 'waiting'}
                    className={`rounded-xl px-4 py-2.5 font-bold transition ${
                      customer.status !== 'waiting' ? 'bg-gray-200 text-gray-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    Hint (Auto)
                  </button>
                  <button
                    onClick={serveCustomer}
                    disabled={customer.status !== 'waiting' || !canServeNow}
                    className={`rounded-xl px-4 py-2.5 font-bold transition ${
                      customer.status !== 'waiting' || !canServeNow
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    Serve ✅
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={clearGiven}
                    disabled={customer.status !== 'waiting'}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition ${
                      customer.status !== 'waiting' ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    Clear Change
                  </button>

                  <button
                    onClick={resetAll}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                  >
                    Reset
                  </button>
                </div>

                {!canAffordGivenFromStock && (
                  <div className="mt-2 text-xs font-bold text-red-600">You tried to give more than your stock.</div>
                )}
              </div>
            </div>

            {/* RIGHT: cash register controls (kept) */}
            <div className="pointer-events-auto w-[340px]">
              <div className="bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-gray-900">💰 Give Change</div>
                  <div className="text-xs font-bold text-gray-700">
                    {customer.status === 'waiting' ? `Due: ${taka(customer.changeDue)}` : '—'}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {DENOMS.map((d) => {
                    const have = stock[d] || 0
                    const used = given[d] || 0
                    const disabled = customer.status !== 'waiting'
                    return (
                      <div
                        key={d}
                        className={`rounded-2xl border p-2 ${
                          d >= 50 ? 'bg-sky-50 border-sky-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-black text-gray-900">{d}৳</div>
                          <div className="text-[11px] font-bold text-gray-600">
                            {used}/{have}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => addGive(d)}
                            disabled={disabled}
                            className={`rounded-xl py-2 font-black transition ${
                              disabled ? 'bg-gray-200 text-gray-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeGive(d)}
                            disabled={disabled || used <= 0}
                            className={`rounded-xl py-2 font-black transition ${
                              disabled || used <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-pink-600 hover:bg-pink-500 text-white'
                            }`}
                          >
                            −
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  Tip: You can deny the sale if you truly can’t make exact change.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className={`max-w-[520px] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toneStyle(toast.tone)}`}>
              <div className="font-black">{toast.title}</div>
              {toast.desc && <div className="text-sm opacity-95">{toast.desc}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Minimal bottom lesson bar */}
      <div className="bg-white/70 border-t border-white/60 backdrop-blur-xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
          <div className="font-semibold">Rule: Give exact change — or deny the sale.</div>
          <div className="text-gray-600">Customer money goes into your stock (so you can use it later).</div>
        </div>
      </div>
    </div>
  )
}
