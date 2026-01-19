'use client'

import { useEffect, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, isPointInRectangle, getCanvasCoordinates, Rectangle } from '@/lib/webgl-shapes'

interface Item {
  id: string
  name: string
  category: 'need' | 'want' | null
  x: number
  y: number
  color: string
}

export default function NeedsVsWants() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [items, setItems] = useState<Item[]>([
    { id: 'food', name: 'Food', category: null, x: 150, y: 150, color: '#ff6b6b' },
    { id: 'water', name: 'Water', category: null, x: 300, y: 150, color: '#4ecdc4' },
    { id: 'shelter', name: 'Shelter', category: null, x: 450, y: 150, color: '#45b7d1' },
    { id: 'clothes', name: 'Clothes', category: null, x: 150, y: 250, color: '#f9ca24' },
    { id: 'toy', name: 'Toy', category: null, x: 300, y: 250, color: '#6c5ce7' },
    { id: 'game', name: 'Video Game', category: null, x: 450, y: 250, color: '#fd79a8' },
    { id: 'candy', name: 'Candy', category: null, x: 150, y: 350, color: '#fdcb6e' },
    { id: 'education', name: 'Education', category: null, x: 300, y: 350, color: '#55efc4' },
  ])
  const [needsItems, setNeedsItems] = useState<Item[]>([])
  const [wantsItems, setWantsItems] = useState<Item[]>([])
  const [score, setScore] = useState(0)

  const correctAnswers: { [key: string]: 'need' | 'want' } = {
    food: 'need',
    water: 'need',
    shelter: 'need',
    clothes: 'need',
    education: 'need',
    toy: 'want',
    game: 'want',
    candy: 'want',
  }

  useEffect(() => {
    // Calculate score based on correct categorizations
    let correct = 0
    needsItems.forEach((item) => {
      if (correctAnswers[item.id] === 'need') correct++
    })
    wantsItems.forEach((item) => {
      if (correctAnswers[item.id] === 'want') correct++
    })
    setScore(correct)
  }, [needsItems, wantsItems])

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

      // Draw NEEDS area (left)
      const needsArea: Rectangle = {
        x: canvas.width * 0.25,
        y: canvas.height / 2,
        width: canvas.width * 0.4,
        height: canvas.height - 200,
        color: '#c8e6c9',
      }
      drawRectangle(gl, setup, needsArea)

      // Draw WANTS area (right)
      const wantsArea: Rectangle = {
        x: canvas.width * 0.75,
        y: canvas.height / 2,
        width: canvas.width * 0.4,
        height: canvas.height - 200,
        color: '#ffccbc',
      }
      drawRectangle(gl, setup, wantsArea)

      // Draw items in their categories
      const allCategorizedItems = [...needsItems, ...wantsItems]
      const uncategorizedItems = items.filter(
        (item) => !allCategorizedItems.find((ci) => ci.id === item.id)
      )

      // Draw uncategorized items (top area)
      uncategorizedItems.forEach((item, index) => {
        const itemX = 100 + (index % 4) * 150
        const itemY = 100 + Math.floor(index / 4) * 100
        const itemRect: Rectangle = {
          x: itemX,
          y: itemY,
          width: 120,
          height: 60,
          color: selectedItem === item.id ? '#ff8800' : item.color,
        }
        drawRectangle(gl, setup, itemRect)
      })

      // Draw items in NEEDS area
      needsItems.forEach((item, index) => {
        const itemX = canvas.width * 0.25
        const itemY = 150 + index * 80
        const itemRect: Rectangle = {
          x: itemX,
          y: itemY,
          width: 120,
          height: 60,
          color: item.color,
        }
        drawRectangle(gl, setup, itemRect)
      })

      // Draw items in WANTS area
      wantsItems.forEach((item, index) => {
        const itemX = canvas.width * 0.75
        const itemY = 150 + index * 80
        const itemRect: Rectangle = {
          x: itemX,
          y: itemY,
          width: 120,
          height: 60,
          color: item.color,
        }
        drawRectangle(gl, setup, itemRect)
      })
    }

    render()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [items, selectedItem, needsItems, wantsItems])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)
    const allCategorizedItems = [...needsItems, ...wantsItems]
    const uncategorizedItems = items.filter(
      (item) => !allCategorizedItems.find((ci) => ci.id === item.id)
    )

    for (let i = uncategorizedItems.length - 1; i >= 0; i--) {
      const item = uncategorizedItems[i]
      const itemX = 100 + (i % 4) * 150
      const itemY = 100 + Math.floor(i / 4) * 100

      if (
        isPointInRectangle(coords.x, coords.y, {
          x: itemX,
          y: itemY,
          width: 120,
          height: 60,
          color: item.color,
        })
      ) {
        setSelectedItem(item.id)
        setDragOffset({
          x: coords.x - itemX,
          y: coords.y - itemY,
        })
        break
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedItem || !dragOffset) return

    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)
    const needsAreaX = canvas.width * 0.25
    const wantsAreaX = canvas.width * 0.75
    const needsAreaWidth = canvas.width * 0.4
    const wantsAreaWidth = canvas.width * 0.4
    const areaHeight = canvas.height - 200
    const areaTop = 100
    const areaBottom = areaTop + areaHeight

    // Check if dropped in NEEDS area
    if (
      coords.x >= needsAreaX - needsAreaWidth / 2 &&
      coords.x <= needsAreaX + needsAreaWidth / 2 &&
      coords.y >= areaTop &&
      coords.y <= areaBottom
    ) {
      const item = items.find((i) => i.id === selectedItem)
      if (item) {
        setNeedsItems([...needsItems, { ...item, category: 'need' }])
        setSelectedItem(null)
        setDragOffset(null)
      }
      return
    }

    // Check if dropped in WANTS area
    if (
      coords.x >= wantsAreaX - wantsAreaWidth / 2 &&
      coords.x <= wantsAreaX + wantsAreaWidth / 2 &&
      coords.y >= areaTop &&
      coords.y <= areaBottom
    ) {
      const item = items.find((i) => i.id === selectedItem)
      if (item) {
        setWantsItems([...wantsItems, { ...item, category: 'want' }])
        setSelectedItem(null)
        setDragOffset(null)
      }
      return
    }
  }

  const handleMouseUp = () => {
    setSelectedItem(null)
    setDragOffset(null)
  }

  const reset = () => {
    setNeedsItems([])
    setWantsItems([])
    setScore(0)
  }

  const maxScore = Object.keys(correctAnswers).length

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          style={{ display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-4 shadow-lg max-w-xs">
          <h4 className="font-bold text-gray-800 mb-2">🎯 Needs vs Wants</h4>
          <p className="text-sm text-gray-600 mb-2">
            Drag items to categorize them as Needs or Wants!
          </p>
        </div>

        {/* Labels */}
        <div className="absolute top-20 left-1/4 transform -translate-x-1/2 bg-green-500 text-white rounded-full px-6 py-2 shadow-lg">
          <span className="font-bold">NEEDS</span>
        </div>
        <div className="absolute top-20 right-1/4 transform translate-x-1/2 bg-orange-500 text-white rounded-full px-6 py-2 shadow-lg">
          <span className="font-bold">WANTS</span>
        </div>

        {/* Score */}
        <div className="absolute top-4 right-4 bg-primary-500 text-white rounded-lg px-6 py-4 shadow-lg">
          <div className="text-center">
            <div className="text-sm font-semibold opacity-90">Score</div>
            <div className="text-3xl font-bold">
              {score}/{maxScore}
            </div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {score === maxScore ? (
              <span className="text-green-600 font-bold">🎉 Perfect! All correct!</span>
            ) : (
              <span>
                Categorized: <span className="font-semibold">{score}</span>/{maxScore} correctly
              </span>
            )}
          </div>
          <button onClick={reset} className="btn-secondary text-sm px-4 py-2">
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

