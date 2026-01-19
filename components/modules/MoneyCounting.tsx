'use client'

import { useEffect, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, isPointInCircle, isPointInRectangle, getCanvasCoordinates, Circle, Rectangle } from '@/lib/webgl-shapes'

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

export default function MoneyCounting() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [totalValue, setTotalValue] = useState(0)
  const [currencyItems, setCurrencyItems] = useState<CurrencyItem[]>([
    // Coins
    { id: 'coin-1', type: 'coin', value: 1, x: 150, y: 150, color: '#c0c0c0', radius: 30 },
    { id: 'coin-2', type: 'coin', value: 2, x: 220, y: 150, color: '#a0a0a0', radius: 35 },
    { id: 'coin-5', type: 'coin', value: 5, x: 290, y: 150, color: '#808080', radius: 40 },
    { id: 'coin-10', type: 'coin', value: 10, x: 150, y: 220, color: '#606060', radius: 45 },
    // Bills
    { id: 'bill-20', type: 'bill', value: 20, x: 400, y: 150, color: '#4a90e2', width: 80, height: 40 },
    { id: 'bill-50', type: 'bill', value: 50, x: 500, y: 150, color: '#5cb85c', width: 80, height: 40 },
    { id: 'bill-100', type: 'bill', value: 100, x: 400, y: 220, color: '#f0ad4e', width: 80, height: 40 },
    { id: 'bill-500', type: 'bill', value: 500, x: 500, y: 220, color: '#d9534f', width: 80, height: 40 },
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set initial canvas size
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

      // Draw counting area (rectangle at bottom)
      const countingArea: Rectangle = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: canvas.width - 100,
        height: 80,
        color: '#e8f4f8',
      }
      drawRectangle(gl, setup, countingArea)

      // Draw border for counting area
      const border: Rectangle = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: canvas.width - 100,
        height: 80,
        color: '#3b82f6',
      }
      // Draw border as outline (we'll draw it as a thin rectangle)
      const borderThickness = 3
      const borderRect: Rectangle = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: canvas.width - 100,
        height: borderThickness,
        color: '#3b82f6',
      }
      drawRectangle(gl, setup, borderRect)
      borderRect.y = canvas.height - 20
      drawRectangle(gl, setup, borderRect)
      borderRect.width = borderThickness
      borderRect.height = 80
      borderRect.x = 50
      borderRect.y = canvas.height - 100
      drawRectangle(gl, setup, borderRect)
      borderRect.x = canvas.width - 50
      drawRectangle(gl, setup, borderRect)

      // Draw currency items
      currencyItems.forEach((item) => {
        if (item.type === 'coin' && item.radius) {
          drawCircle(gl, setup, {
            x: item.x,
            y: item.y,
            radius: item.radius,
            color: selectedItem === item.id ? '#ff8800' : item.color,
          })
        } else if (item.type === 'bill' && item.width && item.height) {
          drawRectangle(gl, setup, {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            color: selectedItem === item.id ? '#ff8800' : item.color,
          })
        }
      })
    }

    // Initial render
    render()
    
    // Set up resize observer for better canvas sizing
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(canvas)
    
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [currencyItems, selectedItem])

  // Calculate total value of items in counting area
  useEffect(() => {
    const countingAreaY = canvasRef.current ? canvasRef.current.height - 100 : 0
    const countingAreaTop = countingAreaY - 40
    const countingAreaBottom = countingAreaY + 40

    const itemsInArea = currencyItems.filter((item) => {
      return item.y >= countingAreaTop && item.y <= countingAreaBottom
    })

    const total = itemsInArea.reduce((sum, item) => sum + item.value, 0)
    setTotalValue(total)
  }, [currencyItems])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)
    let found = false

    for (let i = currencyItems.length - 1; i >= 0; i--) {
      const item = currencyItems[i]
      let isInside = false

      if (item.type === 'coin' && item.radius) {
        isInside = isPointInCircle(coords.x, coords.y, {
          x: item.x,
          y: item.y,
          radius: item.radius,
          color: item.color,
        })
      } else if (item.type === 'bill' && item.width && item.height) {
        isInside = isPointInRectangle(coords.x, coords.y, {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          color: item.color,
        })
      }

      if (isInside) {
        setSelectedItem(item.id)
        setDragOffset({
          x: coords.x - item.x,
          y: coords.y - item.y,
        })
        found = true
        break
      }
    }

    if (!found) {
      setSelectedItem(null)
      setDragOffset(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedItem || !dragOffset) return

    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)
    const newX = coords.x - dragOffset.x
    const newY = coords.y - dragOffset.y

    setCurrencyItems((items) =>
      items.map((item) =>
        item.id === selectedItem
          ? { ...item, x: Math.max(0, Math.min(newX, canvas.width)), y: Math.max(0, Math.min(newY, canvas.height)) }
          : item
      )
    )
  }

  const handleMouseUp = () => {
    setSelectedItem(null)
    setDragOffset(null)
  }

  const resetItems = () => {
    setCurrencyItems([
      { id: 'coin-1', type: 'coin', value: 1, x: 150, y: 150, color: '#c0c0c0', radius: 30 },
      { id: 'coin-2', type: 'coin', value: 2, x: 220, y: 150, color: '#a0a0a0', radius: 35 },
      { id: 'coin-5', type: 'coin', value: 5, x: 290, y: 150, color: '#808080', radius: 40 },
      { id: 'coin-10', type: 'coin', value: 10, x: 150, y: 220, color: '#606060', radius: 45 },
      { id: 'bill-20', type: 'bill', value: 20, x: 400, y: 150, color: '#4a90e2', width: 80, height: 40 },
      { id: 'bill-50', type: 'bill', value: 50, x: 500, y: 150, color: '#5cb85c', width: 80, height: 40 },
      { id: 'bill-100', type: 'bill', value: 100, x: 400, y: 220, color: '#f0ad4e', width: 80, height: 40 },
      { id: 'bill-500', type: 'bill', value: 500, x: 500, y: 220, color: '#d9534f', width: 80, height: 40 },
    ])
    setTotalValue(0)
  }

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
        
        {/* Instructions overlay */}
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-4 shadow-lg max-w-xs">
          <h4 className="font-bold text-gray-800 mb-2">💰 Money Counting</h4>
          <p className="text-sm text-gray-600 mb-2">
            Drag coins and bills into the counting area at the bottom!
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Coins: 1, 2, 5, 10 Taka</p>
            <p>• Bills: 20, 50, 100, 500 Taka</p>
          </div>
        </div>

        {/* Total display */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white rounded-full px-8 py-4 shadow-lg">
          <div className="text-center">
            <div className="text-sm font-semibold opacity-90">Total Value</div>
            <div className="text-3xl font-bold">{totalValue} Taka</div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Items in counting area:</span>{' '}
              {currencyItems.filter((item) => {
                const countingAreaY = canvasRef.current ? canvasRef.current.height - 100 : 0
                return item.y >= countingAreaY - 40 && item.y <= countingAreaY + 40
              }).length}
            </div>
          </div>
          <button
            onClick={resetItems}
            className="btn-secondary text-sm px-4 py-2"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  )
}

