'use client'

import { useEffect, useRef, useState } from 'react'
import { initWebGL, setupBasic2D } from '@/lib/webgl-utils'
import { drawCircle, drawRectangle, Circle, Rectangle } from '@/lib/webgl-shapes'

export default function SavingsVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [savings, setSavings] = useState(0)
  const [piggyBankLevel, setPiggyBankLevel] = useState(0)
  const [treeLevel, setTreeLevel] = useState(0)

  // Piggy bank grows 1 level per 100 Taka
  // Tree grows 1 level per 500 Taka
  useEffect(() => {
    setPiggyBankLevel(Math.floor(savings / 100))
    setTreeLevel(Math.floor(savings / 500))
  }, [savings])

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

    gl.clearColor(0.9, 0.95, 0.9, 1.0) // Light green background
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
      const groundY = canvas.height - 50

      // Draw ground
      const ground: Rectangle = {
        x: centerX,
        y: groundY + 25,
        width: canvas.width,
        height: 50,
        color: '#8b7355',
      }
      drawRectangle(gl, setup, ground)

      // Draw grass on ground
      const grass: Rectangle = {
        x: centerX,
        y: groundY,
        width: canvas.width,
        height: 10,
        color: '#7cb342',
      }
      drawRectangle(gl, setup, grass)

      // Draw Piggy Bank (left side)
      const piggyX = canvas.width * 0.25
      const piggyBaseY = groundY - 20
      const piggyHeight = 100 + piggyBankLevel * 20 // Grows with level
      const piggyColor = piggyBankLevel >= 5 ? '#ff6b9d' : '#ffb3d9' // Changes color at 500 Taka

      // Piggy bank body (ellipse-like using circle)
      const piggyBody: Circle = {
        x: piggyX,
        y: piggyBaseY - piggyHeight / 2,
        radius: 40 + piggyBankLevel * 5,
        color: piggyColor,
      }
      drawCircle(gl, setup, piggyBody)

      // Piggy bank snout
      const snout: Circle = {
        x: piggyX + 30,
        y: piggyBaseY - piggyHeight / 2 + 10,
        radius: 15,
        color: '#ffb3d9',
      }
      drawCircle(gl, setup, snout)

      // Piggy bank legs
      const leg1: Rectangle = {
        x: piggyX - 20,
        y: piggyBaseY + 10,
        width: 12,
        height: 20,
        color: piggyColor,
      }
      drawRectangle(gl, setup, leg1)
      const leg2: Rectangle = {
        x: piggyX + 20,
        y: piggyBaseY + 10,
        width: 12,
        height: 20,
        color: piggyColor,
      }
      drawRectangle(gl, setup, leg2)

      // Draw Tree (right side)
      const treeX = canvas.width * 0.75
      const treeBaseY = groundY
      const treeTrunkHeight = 80 + treeLevel * 30
      const treeCrownSize = 60 + treeLevel * 20

      // Tree trunk
      const trunk: Rectangle = {
        x: treeX,
        y: treeBaseY - treeTrunkHeight / 2,
        width: 30,
        height: treeTrunkHeight,
        color: '#8b4513',
      }
      drawRectangle(gl, setup, trunk)

      // Tree crown (leaves) - multiple circles for foliage
      const crownColors = ['#4caf50', '#66bb6a', '#81c784']
      for (let i = 0; i < 3; i++) {
        const crown: Circle = {
          x: treeX + (i - 1) * 25,
          y: treeBaseY - treeTrunkHeight - 20 - i * 15,
          radius: treeCrownSize / 2 - i * 5,
          color: crownColors[i % crownColors.length],
        }
        drawCircle(gl, setup, crown)
      }

      // Draw coins falling into piggy bank (animation)
      const time = Date.now() / 1000
      for (let i = 0; i < 3; i++) {
        const coinY = (piggyBaseY - piggyHeight / 2 - 50) + Math.sin(time * 2 + i) * 20
        const coin: Circle = {
          x: piggyX + Math.cos(time * 2 + i) * 30,
          y: coinY,
          radius: 8,
          color: '#ffd700',
        }
        drawCircle(gl, setup, coin)
      }

    }

    let animationId: number
    const animate = () => {
      render()
      animationId = requestAnimationFrame(animate)
    }
    animate()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [piggyBankLevel, treeLevel])

  const addSavings = (amount: number) => {
    setSavings((prev) => Math.min(prev + amount, 2000)) // Cap at 2000 for demo
  }

  const resetSavings = () => {
    setSavings(0)
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
          <h4 className="font-bold text-gray-800 mb-2">🐷 Savings Visualization</h4>
          <p className="text-sm text-gray-600 mb-2">
            Watch your piggy bank and tree grow as you save!
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Piggy bank: +1 level per 100 Taka</p>
            <p>• Tree: +1 level per 500 Taka</p>
            <p>• Color changes at 500 Taka!</p>
          </div>
        </div>

        {/* Savings display */}
        <div className="absolute top-4 right-4 bg-primary-500 text-white rounded-lg px-6 py-4 shadow-lg">
          <div className="text-center">
            <div className="text-sm font-semibold opacity-90">Total Savings</div>
            <div className="text-3xl font-bold">{savings} Taka</div>
          </div>
        </div>

        {/* Level indicators */}
        <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-4 shadow-lg">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Piggy Bank Level:</span>{' '}
              <span className="text-primary-600 font-bold">{piggyBankLevel}</span>
            </div>
            <div>
              <span className="font-semibold">Tree Level:</span>{' '}
              <span className="text-green-600 font-bold">{treeLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => addSavings(10)}
              className="btn-primary text-sm px-4 py-2"
            >
              +10 Taka
            </button>
            <button
              onClick={() => addSavings(50)}
              className="btn-primary text-sm px-4 py-2"
            >
              +50 Taka
            </button>
            <button
              onClick={() => addSavings(100)}
              className="btn-primary text-sm px-4 py-2"
            >
              +100 Taka
            </button>
            <button
              onClick={() => addSavings(500)}
              className="btn-primary text-sm px-4 py-2"
            >
              +500 Taka
            </button>
          </div>
          <button
            onClick={resetSavings}
            className="btn-secondary text-sm px-4 py-2"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

