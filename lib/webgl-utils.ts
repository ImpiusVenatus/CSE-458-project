/**
 * WebGL Utility Functions
 * Helper functions for WebGL context setup and basic operations
 */

export interface WebGLContext {
  gl: WebGLRenderingContext | null
  program: WebGLProgram | null
}

/**
 * Initialize WebGL context from a canvas element
 */
export function initWebGL(canvas: HTMLCanvasElement): WebGLContext {
  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null

  if (!gl) {
    console.error('WebGL is not supported in this browser')
    return { gl: null, program: null }
  }

  // Set canvas size
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  gl.viewport(0, 0, canvas.width, canvas.height)

  return { gl, program: null }
}

/**
 * Create and compile a shader
 */
export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compiling shader:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

/**
 * Create a WebGL program from vertex and fragment shader sources
 */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

  if (!vertexShader || !fragmentShader) {
    return null
  }

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Error linking program:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

/**
 * Basic 2D vertex shader for rendering primitives
 */
export const basicVertexShader = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform vec2 u_resolution;
  uniform mat3 u_matrix;
  
  varying vec4 v_color;
  
  void main() {
    vec2 position = (u_matrix * vec3(a_position, 1)).xy;
    vec2 clipSpace = ((position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_color = a_color;
  }
`

/**
 * Basic fragment shader for rendering colors
 */
export const basicFragmentShader = `
  precision mediump float;
  
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
  }
`

/**
 * Create a basic 2D rendering program
 */
export function createBasic2DProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  return createProgram(gl, basicVertexShader, basicFragmentShader)
}

/**
 * Set up a basic 2D rendering context
 */
export function setupBasic2D(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): {
  program: WebGLProgram
  positionLocation: number
  colorLocation: number
  resolutionLocation: WebGLUniformLocation | null
  matrixLocation: WebGLUniformLocation | null
} | null {
  const program = createBasic2DProgram(gl)
  if (!program) return null

  gl.useProgram(program)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const colorLocation = gl.getAttribLocation(program, 'a_color')
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix')

  // Set resolution
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height)

  // Create identity matrix
  const identityMatrix = new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ])
  gl.uniformMatrix3fv(matrixLocation, false, identityMatrix)

  return {
    program,
    positionLocation,
    colorLocation,
    resolutionLocation,
    matrixLocation,
  }
}

/**
 * Create a 2D transformation matrix
 */
export function create2DMatrix(
  translateX: number = 0,
  translateY: number = 0,
  scaleX: number = 1,
  scaleY: number = 1,
  rotation: number = 0
): Float32Array {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return new Float32Array([
    scaleX * cos, scaleX * sin, 0,
    -scaleY * sin, scaleY * cos, 0,
    translateX, translateY, 1
  ])
}

/**
 * Convert hex color to normalized RGB array
 */
export function hexToRgb(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0, 1]
  
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1
  ]
}

