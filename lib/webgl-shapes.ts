/**
 * WebGL Shape Rendering Functions
 * Functions for rendering 2D shapes (circles, rectangles) with WebGL
 */

import { hexToRgb } from './webgl-utils'

export interface Circle {
  x: number
  y: number
  radius: number
  color: string
  id?: string
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
  color: string
  rotation?: number
  id?: string
}

/**
 * Draw a circle using WebGL
 */
export function drawCircle(
  gl: WebGLRenderingContext,
  setup: any,
  circle: Circle,
  segments: number = 32
) {
  const positions: number[] = []
  const colors: number[] = []
  const color = hexToRgb(circle.color)

  // Center point
  positions.push(circle.x, circle.y)
  colors.push(...color)

  // Circle points
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    positions.push(
      circle.x + Math.cos(angle) * circle.radius,
      circle.y + Math.sin(angle) * circle.radius
    )
    colors.push(...color)
  }

  // Create and bind position buffer
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.positionLocation)
  gl.vertexAttribPointer(setup.positionLocation, 2, gl.FLOAT, false, 0, 0)

  // Create and bind color buffer
  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.colorLocation)
  gl.vertexAttribPointer(setup.colorLocation, 4, gl.FLOAT, false, 0, 0)

  // Draw
  gl.drawArrays(gl.TRIANGLE_FAN, 0, segments + 2)
}

/**
 * Draw a rectangle using WebGL
 */
export function drawRectangle(
  gl: WebGLRenderingContext,
  setup: any,
  rect: Rectangle
) {
  const positions: number[] = []
  const colors: number[] = []
  const color = hexToRgb(rect.color)

  const rotation = rect.rotation || 0
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  // Rectangle corners (before rotation)
  const corners = [
    [-rect.width / 2, -rect.height / 2],
    [rect.width / 2, -rect.height / 2],
    [rect.width / 2, rect.height / 2],
    [-rect.width / 2, rect.height / 2],
  ]

  // Apply rotation and translation
  corners.forEach(([dx, dy]) => {
    const rotatedX = dx * cos - dy * sin
    const rotatedY = dx * sin + dy * cos
    positions.push(rect.x + rotatedX, rect.y + rotatedY)
    colors.push(...color)
  })

  // Create and bind position buffer
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.positionLocation)
  gl.vertexAttribPointer(setup.positionLocation, 2, gl.FLOAT, false, 0, 0)

  // Create and bind color buffer
  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.colorLocation)
  gl.vertexAttribPointer(setup.colorLocation, 4, gl.FLOAT, false, 0, 0)

  // Draw as two triangles
  const indices = [0, 1, 2, 0, 2, 3]
  const indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  )

  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(
  x: number,
  y: number,
  circle: Circle
): boolean {
  const dx = x - circle.x
  const dy = y - circle.y
  return dx * dx + dy * dy <= circle.radius * circle.radius
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRectangle(
  x: number,
  y: number,
  rect: Rectangle
): boolean {
  const rotation = rect.rotation || 0
  const cos = Math.cos(-rotation)
  const sin = Math.sin(-rotation)

  // Translate point to rectangle's local space
  const dx = x - rect.x
  const dy = y - rect.y

  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos

  return (
    localX >= -rect.width / 2 &&
    localX <= rect.width / 2 &&
    localY >= -rect.height / 2 &&
    localY <= rect.height / 2
  )
}

/**
 * Get canvas coordinates from mouse event
 */
export function getCanvasCoordinates(
  event: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

