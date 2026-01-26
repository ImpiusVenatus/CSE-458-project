'use client'

import { useEffect, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, Rectangle, Circle } from '@/lib/webgl-shapes'
import { useProgress } from '@/lib/progress-context'

interface Goal {
  id: string
  name: string
  target: number
  current: number
  color: string
}

const DEFAULT_GOALS: Goal[] = [
  { id: 'goal1', name: 'New Toy', target: 500, current: 0, color: '#ff6b6b' },
  { id: 'goal2', name: 'Bicycle', target: 2000, current: 0, color: '#4ecdc4' },
  { id: 'goal3', name: 'Game Console', target: 5000, current: 0, color: '#45b7d1' },
]

export default function GoalSetting() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getProgress, setProgress } = useProgress()
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  const hasLoadedRef = useRef(false)
  useEffect(() => {
    const saved = getProgress().goalSetting?.goals
    if (saved?.length) {
      setGoals((prev) =>
        prev.map((g) => {
          const s = saved.find((x) => x.id === g.id)
          return s != null ? { ...g, current: s.current } : g
        })
      )
    }
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    setProgress({
      goalSetting: {
        goals: goals.map((g) => ({ id: g.id, current: g.current })),
      },
    })
  }, [goals, setProgress])

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

    gl.clearColor(0.95, 0.97, 1.0, 1.0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const handleResize = () => {
      updateCanvasSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (setup.resolutionLocation) {
        gl.uniform2f(setup.resolutionLocation, canvas.width, canvas.height)
      }
      render()
    }

    const render = () => {
      gl.clear(gl.COLOR_BUFFER_BIT)

      const centerX = canvas.width / 2
      const startY = 150
      const spacing = 120

      goals.forEach((goal, index) => {
        const y = startY + index * spacing
        const progress = Math.min(goal.current / goal.target, 1)
        const barWidth = (canvas.width - 200) * progress
        const isSelected = selectedGoal === goal.id

        // Goal background bar
        const backgroundBar: Rectangle = {
          x: centerX,
          y: y,
          width: canvas.width - 200,
          height: 40,
          color: '#e0e0e0',
        }
        drawRectangle(gl, setup, backgroundBar)

        // Progress bar
        if (progress > 0) {
          const progressBar: Rectangle = {
            x: 100 + barWidth / 2,
            y: y,
            width: barWidth,
            height: 40,
            color: isSelected ? '#ff8800' : goal.color,
          }
          drawRectangle(gl, setup, progressBar)
        }

        // Goal circle indicator
        const indicatorSize = progress >= 1 ? 50 : 30
        const indicator: Circle = {
          x: canvas.width - 100,
          y: y,
          radius: indicatorSize,
          color: progress >= 1 ? '#4caf50' : goal.color,
        }
        drawCircle(gl, setup, indicator)

        // Celebration effect for completed goals
        if (progress >= 1) {
          const time = Date.now() / 1000
          for (let i = 0; i < 5; i++) {
            const angle = (time * 2 + (i / 5) * Math.PI * 2) % (Math.PI * 2)
            const sparkle: Circle = {
              x: canvas.width - 100 + Math.cos(angle) * 60,
              y: y + Math.sin(angle) * 60,
              radius: 5,
              color: '#ffd700',
            }
            drawCircle(gl, setup, sparkle)
          }
        }
      })

      // Draw milestone markers
      goals.forEach((goal, index) => {
        const y = startY + index * spacing
        const milestones = [0.25, 0.5, 0.75, 1.0]
        milestones.forEach((milestone) => {
          const milestoneX = 100 + (canvas.width - 200) * milestone
          const milestoneMarker: Rectangle = {
            x: milestoneX,
            y: y,
            width: 2,
            height: 40,
            color: '#999999',
          }
          drawRectangle(gl, setup, milestoneMarker)
        })
      })
    }

    render()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [goals, selectedGoal])

  const addSavings = (goalId: string, amount: number) => {
    setGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? { ...goal, current: Math.min(goal.current + amount, goal.target) }
          : goal
      )
    )
  }

  const resetGoal = (goalId: string) => {
    setGoals(goals.map((goal) => (goal.id === goalId ? { ...goal, current: 0 } : goal)))
  }

  const resetAll = () => {
    setGoals(goals.map((goal) => ({ ...goal, current: 0 })))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-4 shadow-lg max-w-xs">
          <h4 className="font-bold text-gray-800 mb-2">🎯 Goal Setting</h4>
          <p className="text-sm text-gray-600 mb-2">
            Set savings goals and track your progress!
          </p>
        </div>
      </div>

      {/* Goals list and controls */}
      <div className="bg-white border-t p-4">
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = Math.min(goal.current / goal.target, 1)
            const percentage = Math.round(progress * 100)
            const isComplete = progress >= 1

            return (
              <div
                key={goal.id}
                className={`border-2 rounded-lg p-4 ${
                  selectedGoal === goal.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-gray-800">{goal.name}</h5>
                    <p className="text-sm text-gray-600">
                      {goal.current} / {goal.target} Taka ({percentage}%)
                    </p>
                  </div>
                  {isComplete && (
                    <span className="text-2xl">🎉</span>
                  )}
                </div>

                {/* Progress bar (visual) */}
                <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                  <div
                    className="h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedGoal(goal.id)
                      addSavings(goal.id, 50)
                    }}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    +50
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGoal(goal.id)
                      addSavings(goal.id, 100)
                    }}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    +100
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGoal(goal.id)
                      addSavings(goal.id, 500)
                    }}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    +500
                  </button>
                  <button
                    onClick={() => resetGoal(goal.id)}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={resetAll} className="btn-secondary text-sm px-4 py-2">
            Reset All Goals
          </button>
        </div>
      </div>
    </div>
  )
}

