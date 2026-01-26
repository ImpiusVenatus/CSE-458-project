'use client'

import { useEffect, useRef } from 'react'
import { createBudgetGame } from './budget-game/index'

export default function BudgetGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<ReturnType<typeof createBudgetGame> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const game = createBudgetGame()
    gameRef.current = game
    game.init(container, {})
    game.start()
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <div className="h-full flex flex-col relative isolate" style={{ zIndex: 0 }}>
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0 w-full"
        style={{ position: 'relative', minHeight: 200 }}
      />
    </div>
  )
}
