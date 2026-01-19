'use client'

import { useEffect, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, isPointInRectangle, getCanvasCoordinates, Rectangle } from '@/lib/webgl-shapes'

interface Item {
  id: string
  name: string
  price: number
  x: number
  y: number
  color: string
}

export default function MakingChange() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<Item[]>([])
  const [payment, setPayment] = useState(0)
  const [change, setChange] = useState(0)

  const shopItems: Item[] = [
    { id: 'item1', name: 'Toy Car', price: 50, x: 150, y: 150, color: '#ff6b6b' },
    { id: 'item2', name: 'Book', price: 30, x: 300, y: 150, color: '#4ecdc4' },
    { id: 'item3', name: 'Ball', price: 25, x: 450, y: 150, color: '#45b7d1' },
    { id: 'item4', name: 'Puzzle', price: 75, x: 150, y: 250, color: '#f9ca24' },
    { id: 'item5', name: 'Crayons', price: 40, x: 300, y: 250, color: '#6c5ce7' },
    { id: 'item6', name: 'Doll', price: 100, x: 450, y: 250, color: '#fd79a8' },
  ]

  useEffect(() => {
    const total = cartItems.reduce((sum, item) => sum + item.price, 0)
    setChange(payment - total)
  }, [cartItems, payment])

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

      // Draw shop area (top section)
      const shopArea: Rectangle = {
        x: canvas.width / 2,
        y: 200,
        width: canvas.width - 40,
        height: 200,
        color: '#f0f0f0',
      }
      drawRectangle(gl, setup, shopArea)

      // Draw shop items
      shopItems.forEach((item) => {
        const isSelected = selectedItem === item.id
        const itemRect: Rectangle = {
          x: item.x,
          y: item.y,
          width: 100,
          height: 80,
          color: isSelected ? '#ff8800' : item.color,
        }
        drawRectangle(gl, setup, itemRect)

        // Draw price tag
        const priceTag: Rectangle = {
          x: item.x,
          y: item.y + 50,
          width: 100,
          height: 20,
          color: '#ffffff',
        }
        drawRectangle(gl, setup, priceTag)
      })

      // Draw cart area (middle section)
      const cartArea: Rectangle = {
        x: canvas.width / 2,
        y: 450,
        width: canvas.width - 40,
        height: 100,
        color: '#e8f5e9',
      }
      drawRectangle(gl, setup, cartArea)

      // Draw cart items
      cartItems.forEach((item, index) => {
        const cartX = 100 + (index % 4) * 150
        const cartY = 450 + Math.floor(index / 4) * 80
        const cartItem: Rectangle = {
          x: cartX,
          y: cartY,
          width: 120,
          height: 60,
          color: item.color,
        }
        drawRectangle(gl, setup, cartItem)
      })

      // Draw checkout area (bottom section)
      const checkoutArea: Rectangle = {
        x: canvas.width / 2,
        y: canvas.height - 80,
        width: canvas.width - 40,
        height: 100,
        color: '#fff3e0',
      }
      drawRectangle(gl, setup, checkoutArea)
    }

    render()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [selectedItem, cartItems])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(e.nativeEvent, canvas)

    // Check if clicking on shop item
    for (const item of shopItems) {
      if (
        isPointInRectangle(coords.x, coords.y, {
          x: item.x,
          y: item.y,
          width: 100,
          height: 80,
          color: item.color,
        })
      ) {
        setCartItems([...cartItems, { ...item }])
        setSelectedItem(item.id)
        setTimeout(() => setSelectedItem(null), 300)
        return
      }
    }
  }

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    setCartItems([])
    setPayment(0)
  }

  const total = cartItems.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          style={{ display: 'block' }}
          onClick={handleCanvasClick}
        />

        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-4 shadow-lg max-w-xs">
          <h4 className="font-bold text-gray-800 mb-2">🛒 Making Change</h4>
          <p className="text-sm text-gray-600 mb-2">
            Click items to add to cart, then calculate change!
          </p>
        </div>

        {/* Cart summary overlay */}
        <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-4 shadow-lg min-w-[200px]">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Total:</span>{' '}
              <span className="text-primary-600 font-bold">{total} Taka</span>
            </div>
            <div>
              <span className="font-semibold">Payment:</span>{' '}
              <span className="text-green-600 font-bold">{payment} Taka</span>
            </div>
            <div className="border-t pt-2">
              <span className="font-semibold">Change:</span>{' '}
              <span
                className={`font-bold ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {change >= 0 ? change : 'Not enough!'} Taka
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-700">Payment:</span>
            <button
              onClick={() => setPayment(50)}
              className="btn-secondary text-sm px-3 py-1"
            >
              50
            </button>
            <button
              onClick={() => setPayment(100)}
              className="btn-secondary text-sm px-3 py-1"
            >
              100
            </button>
            <button
              onClick={() => setPayment(200)}
              className="btn-secondary text-sm px-3 py-1"
            >
              200
            </button>
            <button
              onClick={() => setPayment(500)}
              className="btn-secondary text-sm px-3 py-1"
            >
              500
            </button>
            <input
              type="number"
              value={payment || ''}
              onChange={(e) => setPayment(Number(e.target.value) || 0)}
              placeholder="Custom"
              className="border rounded px-3 py-1 w-24 text-sm"
            />
          </div>
          <button onClick={clearCart} className="btn-secondary text-sm px-4 py-2">
            Clear Cart
          </button>
        </div>

        {/* Cart items list */}
        {cartItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cartItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="bg-gray-100 rounded px-3 py-1 text-sm flex items-center space-x-2"
              >
                <span>{item.name}</span>
                <span className="text-primary-600 font-semibold">{item.price} Taka</span>
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

