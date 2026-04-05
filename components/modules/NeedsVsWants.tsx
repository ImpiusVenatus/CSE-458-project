'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '@/lib/progress-context'
import { recordNeedsVsWantsDrop, recordNeedsVsWantsRound } from '@/lib/progress'

type Category = 'need' | 'want'

type ItemDef = {
  id: string
  name: string
  emoji: string
  correct: Category
}

type RoundPack = {
  title: string
  items: ItemDef[]
}

const ROUNDS: RoundPack[] = [
  {
    title: 'Home & Daily Life',
    items: [
      { id: 'food', name: 'Food', emoji: '🍛', correct: 'need' },
      { id: 'water', name: 'Water', emoji: '💧', correct: 'need' },
      { id: 'rent', name: 'Rent / Shelter', emoji: '🏠', correct: 'need' },
      { id: 'electricity', name: 'Electricity Bill', emoji: '💡', correct: 'need' },
      { id: 'soap', name: 'Soap', emoji: '🧼', correct: 'need' },
      { id: 'clothes', name: 'Basic Clothes', emoji: '👕', correct: 'need' },
      { id: 'icecream', name: 'Ice Cream', emoji: '🍦', correct: 'want' },
      { id: 'perfume', name: 'Premium Perfume', emoji: '🧴', correct: 'want' },
      { id: 'decor', name: 'Decor Lights', emoji: '✨', correct: 'want' },
      { id: 'toycar', name: 'Toy Car', emoji: '🚗', correct: 'want' },
    ],
  },
  {
    title: 'School & Learning',
    items: [
      { id: 'fees', name: 'School Fees', emoji: '🏫', correct: 'need' },
      { id: 'notebook', name: 'Notebooks', emoji: '📒', correct: 'need' },
      { id: 'pen', name: 'Pen', emoji: '🖊️', correct: 'need' },
      { id: 'lunch', name: 'Lunch', emoji: '🍱', correct: 'need' },
      { id: 'transport', name: 'Transport', emoji: '🚌', correct: 'need' },
      { id: 'uniform', name: 'Uniform', emoji: '🧥', correct: 'need' },
      { id: 'stickers', name: 'Sticker Pack', emoji: '🟡', correct: 'want' },
      { id: 'comic', name: 'Comic Book', emoji: '📚', correct: 'want' },
      { id: 'gaming', name: 'Video Game', emoji: '🎮', correct: 'want' },
      { id: 'latestphone', name: 'Latest Phone', emoji: '📱', correct: 'want' },
    ],
  },
  {
    title: 'Health & Safety',
    items: [
      { id: 'medicine', name: 'Medicine', emoji: '💊', correct: 'need' },
      { id: 'doctor', name: 'Doctor Visit', emoji: '🩺', correct: 'need' },
      { id: 'mask', name: 'Mask / Hygiene', emoji: '😷', correct: 'need' },
      { id: 'firstaid', name: 'First Aid Kit', emoji: '🧰', correct: 'need' },
      { id: 'blanket', name: 'Warm Blanket', emoji: '🛌', correct: 'need' },
      { id: 'healthymeal', name: 'Healthy Meal', emoji: '🥗', correct: 'need' },
      { id: 'energydrink', name: 'Energy Drink', emoji: '🥤', correct: 'want' },
      { id: 'spa', name: 'Spa Day', emoji: '🧖', correct: 'want' },
      { id: 'luxwatch', name: 'Luxury Watch', emoji: '⌚', correct: 'want' },
      { id: 'designerbag', name: 'Designer Bag', emoji: '👜', correct: 'want' },
    ],
  },
  {
    title: 'Tech & Entertainment',
    items: [
      { id: 'basicnet', name: 'Basic Internet (study)', emoji: '🌐', correct: 'need' },
      { id: 'charger', name: 'Charger', emoji: '🔌', correct: 'need' },
      { id: 'phonefix', name: 'Phone Repair', emoji: '🛠️', correct: 'need' },
      { id: 'groceries', name: 'Groceries', emoji: '🛒', correct: 'need' },
      { id: 'buspass', name: 'Bus Pass', emoji: '🎟️', correct: 'need' },
      { id: 'cvprint', name: 'CV Print', emoji: '📄', correct: 'need' },
      { id: 'netflix', name: 'Streaming Subscription', emoji: '📺', correct: 'want' },
      { id: 'console', name: 'Game Console', emoji: '🕹️', correct: 'want' },
      { id: 'earbuds', name: 'Wireless Earbuds', emoji: '🎧', correct: 'want' },
      { id: 'skins', name: 'Game Skins', emoji: '🎨', correct: 'want' },
    ],
  },
  {
    title: 'Family & Community',
    items: [
      { id: 'rice', name: 'Rice', emoji: '🍚', correct: 'need' },
      { id: 'gas', name: 'Cooking Gas', emoji: '🔥', correct: 'need' },
      { id: 'diapers', name: 'Baby Diapers', emoji: '🍼', correct: 'need' },
      { id: 'emergency', name: 'Emergency Savings', emoji: '🛟', correct: 'need' },
      { id: 'homerepair', name: 'Home Repair', emoji: '🧰', correct: 'need' },
      { id: 'medicine2', name: 'Basic Vitamins', emoji: '🧃', correct: 'need' },
      { id: 'birthday', name: 'Birthday Party', emoji: '🎂', correct: 'want' },
      { id: 'restaurant', name: 'Restaurant Dinner', emoji: '🍽️', correct: 'want' },
      { id: 'themepark', name: 'Theme Park', emoji: '🎡', correct: 'want' },
      { id: 'fancycake', name: 'Fancy Cake', emoji: '🍰', correct: 'want' },
    ],
  },
]

// helpers
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type FlyAnim = {
  id: string
  emoji: string
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export default function NeedsVsWants() {
  const { userId } = useProgress()
  const [round, setRound] = useState(0)
  const [showTip, setShowTip] = useState(false)
  const [attemptVersion, setAttemptVersion] = useState(0)

  const roundPack = ROUNDS[round]
  const totalRounds = ROUNDS.length

  const [pool, setPool] = useState<ItemDef[]>([])
  const [needs, setNeeds] = useState<ItemDef[]>([])
  const [wants, setWants] = useState<ItemDef[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // feedback
  const [toast, setToast] = useState<{ title: string; desc?: string; tone: 'good' | 'warn' | 'info' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // tiny exchange animation
  const [fly, setFly] = useState<FlyAnim | null>(null)
  const poolRef = useRef<HTMLDivElement>(null)
  const needsRef = useRef<HTMLDivElement>(null)
  const wantsRef = useRef<HTMLDivElement>(null)
  const itemElMap = useRef<Record<string, HTMLDivElement | null>>({})
  const recordedAttemptRef = useRef<number | null>(null)

  const score = useMemo(() => {
    let c = 0
    for (const it of needs) if (it.correct === 'need') c++
    for (const it of wants) if (it.correct === 'want') c++
    return c
  }, [needs, wants])

  const done = pool.length === 0
  const perfect = done && score === roundPack.items.length

  const showToast = (t: { title: string; desc?: string; tone: 'good' | 'warn' | 'info' }) => {
    setToast(t)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }

  useEffect(() => {
    // new round
    setPool(shuffle(roundPack.items))
    setNeeds([])
    setWants([])
    setDraggingId(null)
    setAttemptVersion((v) => v + 1)
    recordedAttemptRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const removeFromPool = (id: string) => {
    setPool((p) => p.filter((x) => x.id !== id))
  }

  const animateDrop = (item: ItemDef, target: Category) => {
    const el = itemElMap.current[item.id]
    const fromRect = el?.getBoundingClientRect()
    const toRect = (target === 'need' ? needsRef.current : wantsRef.current)?.getBoundingClientRect()
    if (!fromRect || !toRect) return

    setFly({
      id: item.id,
      emoji: item.emoji,
      from: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
      to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
    })

    setTimeout(() => setFly(null), 520)
  }

  const dropTo = (target: Category, id: string) => {
    const item = pool.find((x) => x.id === id)
    if (!item) return

    animateDrop(item, target)
    removeFromPool(id)

    if (target === 'need') setNeeds((n) => [item, ...n])
    else setWants((w) => [item, ...w])

    const isCorrect = item.correct === target
    recordNeedsVsWantsDrop(userId, {
      itemName: item.name,
      target,
      correctTarget: item.correct,
      correct: isCorrect,
    })
    showToast({
      title: isCorrect ? 'Correct ✅' : 'Oops 😅',
      desc: isCorrect ? `${item.name} is a ${target.toUpperCase()}.` : `${item.name} should go to ${item.correct.toUpperCase()}.`,
      tone: isCorrect ? 'good' : 'warn',
    })
  }

  const resetRound = () => {
    setPool(shuffle(roundPack.items))
    setNeeds([])
    setWants([])
    setDraggingId(null)
    setAttemptVersion((v) => v + 1)
    recordedAttemptRef.current = null
    showToast({ title: 'Reset', desc: 'Try again!', tone: 'info' })
  }

  useEffect(() => {
    if (!done || recordedAttemptRef.current === attemptVersion) return

    recordNeedsVsWantsRound(userId, {
      roundTitle: roundPack.title,
      score,
      totalItems: roundPack.items.length,
      perfect,
    })
    recordedAttemptRef.current = attemptVersion
  }, [attemptVersion, done, perfect, roundPack.items.length, roundPack.title, score, userId])

  const nextRound = () => {
    if (!done) {
      showToast({ title: 'Not finished yet', desc: 'Sort all items first.', tone: 'warn' })
      return
    }
    if (round >= totalRounds - 1) {
      showToast({ title: 'All rounds done!', desc: 'You finished 🎉', tone: 'good' })
      return
    }
    setRound((r) => r + 1)
  }

  const toneCls = (tone: 'good' | 'warn' | 'info') => {
    if (tone === 'good') return 'bg-emerald-600/90 border-emerald-200 text-emerald-50'
    if (tone === 'warn') return 'bg-amber-600/90 border-amber-200 text-amber-50'
    return 'bg-sky-600/85 border-sky-200 text-sky-50'
  }

  return (
    <div className="h-full flex flex-col bg-[#eef6ff]">
      <div className="flex-1 relative p-6">
        {/* main centered layout */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 h-full">
          {/* left panel */}
          <div className="self-center">
            <div className="bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-gray-900">🎯 Needs vs Wants</div>
                <button
                  onClick={() => setShowTip(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition"
                >
                  i Tip
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold px-2 py-1 rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                  Round {round + 1}/{totalRounds}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                  Score {score}/{roundPack.items.length}
                </span>
                {done ? (
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full border ${
                      perfect
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {perfect ? 'Perfect ✅' : 'Done'}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-1 rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                    Sorting…
                  </span>
                )}
              </div>

              <div className="mt-3 text-sm font-semibold text-gray-800">
                {roundPack.title}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Drag each item card into a basket. You’ll instantly see it show up inside.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={resetRound}
                  className="rounded-xl px-4 py-2.5 font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                >
                  Reset
                </button>
                <button
                  onClick={nextRound}
                  className={`rounded-xl px-4 py-2.5 font-bold transition ${
                    round >= totalRounds - 1
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  Next →
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Rule of thumb: If you can live safely without it, it’s usually a <b>WANT</b>.
              </div>
            </div>
          </div>

          {/* center game area */}
          <div className="self-center">
            <div className="bg-white/60 border border-white/60 rounded-3xl shadow-xl p-5">
              {/* pool */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-gray-900">Items</div>
                <div className="text-xs font-bold text-gray-600">
                  Remaining: <span className="text-gray-900">{pool.length}</span>
                </div>
              </div>

              <div
                ref={poolRef}
                className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              >
                {pool.map((it) => (
                  <div
                    key={it.id}
                    ref={(el) => {
                      itemElMap.current[it.id] = el
                    }}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(it.id)
                      e.dataTransfer.setData('text/plain', it.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`select-none rounded-2xl border bg-white shadow-sm px-3 py-3 cursor-grab active:cursor-grabbing transition ${
                      draggingId === it.id ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-slate-100">
                        {it.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900 truncate">{it.name}</div>
                        <div className="text-[11px] text-gray-500">Drag me →</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* baskets */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NEEDS */}
                <div
                  ref={needsRef}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain') || draggingId
                    if (id) dropTo('need', id)
                  }}
                  className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4 min-h-[240px] relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full font-black shadow">
                      🧺 NEEDS
                    </div>
                    <div className="text-xs font-bold text-emerald-900/70">
                      {needs.length} items
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {needs.length === 0 ? (
                      <div className="text-sm text-emerald-900/60 font-semibold">
                        Drop NEED items here (Food, Water, Bills…)
                      </div>
                    ) : (
                      needs.map((it) => (
                        <div
                          key={it.id}
                          className="px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-sm font-bold text-emerald-900 shadow-sm"
                        >
                          {it.emoji} {it.name}
                        </div>
                      ))
                    )}
                  </div>

                  {/* decorative basket weave */}
                  <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-emerald-200/40 blur-2xl" />
                </div>

                {/* WANTS */}
                <div
                  ref={wantsRef}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain') || draggingId
                    if (id) dropTo('want', id)
                  }}
                  className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 min-h-[240px] relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-full font-black shadow">
                      🧺 WANTS
                    </div>
                    <div className="text-xs font-bold text-amber-900/70">
                      {wants.length} items
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {wants.length === 0 ? (
                      <div className="text-sm text-amber-900/60 font-semibold">
                        Drop WANT items here (Toys, Treats, Upgrades…)
                      </div>
                    ) : (
                      wants.map((it) => (
                        <div
                          key={it.id}
                          className="px-3 py-1.5 rounded-full bg-white border border-amber-200 text-sm font-bold text-amber-900 shadow-sm"
                        >
                          {it.emoji} {it.name}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-amber-200/40 blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* fly animation (simple gimmick) */}
        {fly && (
          <div
            className="fixed z-50 pointer-events-none text-2xl"
            style={{
              left: fly.from.x,
              top: fly.from.y,
              transform: 'translate(-50%, -50%)',
              animation: 'flyTo 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
              ['--toX' as any]: `${fly.to.x - fly.from.x}px`,
              ['--toY' as any]: `${fly.to.y - fly.from.y}px`,
            }}
          >
            {fly.emoji}
          </div>
        )}

        <style jsx global>{`
          @keyframes flyTo {
            0% {
              transform: translate(-50%, -50%) translate(0px, 0px) scale(1);
              opacity: 1;
              filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.25));
            }
            70% {
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) translate(var(--toX), var(--toY)) scale(0.9);
              opacity: 0;
              filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
            }
          }
        `}</style>

        {/* toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toneCls(toast.tone)}`}>
              <div className="font-black">{toast.title}</div>
              {toast.desc && <div className="text-sm opacity-95">{toast.desc}</div>}
            </div>
          </div>
        )}

        {/* tip modal */}
        {showTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowTip(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-white/60 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-black text-gray-900">💡 Needs vs Wants</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <b className="text-emerald-700">Needs</b> help you live and stay safe.{' '}
                      <b className="text-amber-700">Wants</b> are nice extras.
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTip(false)}
                    className="rounded-xl px-3 py-2 font-bold bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="font-black text-emerald-800">NEEDS ✅</div>
                    <ul className="mt-2 text-sm text-emerald-900/80 list-disc pl-5 space-y-1">
                      <li>Food, water, shelter, basic clothes</li>
                      <li>School essentials, transport, basic bills</li>
                      <li>Medicine and safety items</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="font-black text-amber-800">WANTS 🎉</div>
                    <ul className="mt-2 text-sm text-amber-900/80 list-disc pl-5 space-y-1">
                      <li>Toys, games, treats, fancy extras</li>
                      <li>Upgrades (premium versions)</li>
                      <li>Entertainment and luxury items</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-700">
                  Ask: <b>“Will I be okay without this?”</b> If yes, it’s usually a{' '}
                  <b className="text-amber-700">Want</b>.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* bottom status bar */}
      <div className="bg-white/70 border-t border-white/60 backdrop-blur-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
          <div className="font-semibold">
            Sorted: <span className="font-black">{needs.length + wants.length}</span> / {roundPack.items.length}
          </div>
          <div className="text-gray-600">
            {done ? (perfect ? 'Perfect round ✅' : 'Round done — try resetting to improve 👀') : 'Drag items into a basket.'}
          </div>
        </div>
      </div>
    </div>
  )
}

function toneCls(tone: 'good' | 'warn' | 'info') {
  if (tone === 'good') return 'bg-emerald-600/90 border-emerald-200 text-emerald-50'
  if (tone === 'warn') return 'bg-amber-600/90 border-amber-200 text-amber-50'
  return 'bg-sky-600/85 border-sky-200 text-sky-50'
}
