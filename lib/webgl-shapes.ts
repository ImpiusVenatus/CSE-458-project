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

export interface RoundedRectangle {
  x: number
  y: number
  width: number
  height: number
  color: string
  cornerRadius?: number
  rotation?: number
}

/**
 * Draw a rounded rectangle (papery note style) using WebGL – triangle fan from center.
 */
export function drawRoundedRectangle(
  gl: WebGLRenderingContext,
  setup: any,
  rect: RoundedRectangle,
  cornerSegments: number = 6
) {
  const positions: number[] = []
  const colors: number[] = []
  const color = hexToRgb(rect.color)
  const cx = rect.x
  const cy = rect.y
  const hw = rect.width / 2
  const hh = rect.height / 2
  const r = Math.min(rect.cornerRadius ?? 8, hw, hh)
  const rot = rect.rotation ?? 0
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)

  function addPoint(px: number, py: number) {
    const dx = px - cx
    const dy = py - cy
    positions.push(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos)
    colors.push(...color)
  }

  // Center
  positions.push(cx, cy)
  colors.push(...color)

  // Perimeter clockwise from top-left: top edge → top-right arc → right → bottom-right arc → bottom → bottom-left arc → left → top-left arc
  const seg = cornerSegments
  // Top edge left to right
  addPoint(cx - hw + r, cy - hh)
  addPoint(cx + hw - r, cy - hh)
  // Top-right arc (center cx+hw-r, cy-hh+r), angle -90° to 0°
  for (let i = 1; i <= seg; i++) {
    const t = (-Math.PI / 2) + (i / seg) * (Math.PI / 2)
    addPoint(cx + hw - r + r * Math.cos(t), cy - hh + r + r * Math.sin(t))
  }
  // Right edge
  addPoint(cx + hw, cy - hh + r)
  addPoint(cx + hw, cy + hh - r)
  // Bottom-right arc (center cx+hw-r, cy+hh-r), angle 0° to 90°
  for (let i = 1; i <= seg; i++) {
    const t = (i / seg) * (Math.PI / 2)
    addPoint(cx + hw - r + r * Math.cos(t), cy + hh - r + r * Math.sin(t))
  }
  // Bottom edge right to left
  addPoint(cx + hw - r, cy + hh)
  addPoint(cx - hw + r, cy + hh)
  // Bottom-left arc (center cx-hw+r, cy+hh-r), angle 90° to 180°
  for (let i = 1; i <= seg; i++) {
    const t = (Math.PI / 2) + (i / seg) * (Math.PI / 2)
    addPoint(cx - hw + r + r * Math.cos(t), cy + hh - r + r * Math.sin(t))
  }
  // Left edge
  addPoint(cx - hw, cy + hh - r)
  addPoint(cx - hw, cy - hh + r)
  // Top-left arc (center cx-hw+r, cy-hh+r), angle 180° to 270°
  for (let i = 1; i <= seg; i++) {
    const t = Math.PI + (i / seg) * (Math.PI / 2)
    addPoint(cx - hw + r + r * Math.cos(t), cy - hh + r + r * Math.sin(t))
  }

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.positionLocation)
  gl.vertexAttribPointer(setup.positionLocation, 2, gl.FLOAT, false, 0, 0)
  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(setup.colorLocation)
  gl.vertexAttribPointer(setup.colorLocation, 4, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLE_FAN, 0, positions.length / 2)
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
 * Get canvas coordinates from mouse or touch event.
 * For touch events use the first touch (touches[0] for start/move, changedTouches[0] for end).
 */
export function getCanvasCoordinates(
  event: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement,
  touchIndex: 0 | 'changed' = 0
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const touchList = touchIndex === 'changed' && 'changedTouches' in event
    ? event.changedTouches
    : 'touches' in event ? event.touches : null
  const clientX = touchList?.length
    ? touchList[0].clientX
    : 'clientX' in event ? event.clientX : 0
  const clientY = touchList?.length
    ? touchList[0].clientY
    : 'clientY' in event ? event.clientY : 0

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

