'use client'

import { useEffect, useRef } from 'react'
import { createMoneyTown } from './moneytown/index'

export default function MoneyTown() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<ReturnType<typeof createMoneyTown> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const game = createMoneyTown()
    gameRef.current = game
    game.init(container, {})
    game.start()
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center relative isolate p-4" style={{ zIndex: 0 }}>
      <div
        ref={containerRef}
        className="relative w-full max-w-[min(95vw,1100px)] max-h-[min(82vh,680px)] rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
        style={{ position: 'relative', minHeight: 420, aspectRatio: '16/10' }}
      />
    </div>
  )
}
