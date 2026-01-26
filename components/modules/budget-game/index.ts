/**
 * Budget Game - Entry: lifecycle init/start/pause/resume/destroy
 */

import type { GameState, Scenario } from './state/GameState'
import { createInitialState } from './state/GameState'
import { gameReducer, type GameAction } from './state/reducer'
import { applyMonthStart, applyMonthEnd } from './engine/MonthEngine'
import { pickEventsForMonth, applyChoice } from './engine/EventEngine'
import { buildOverlay, triggerRender, triggerToast, getOverlayRoot } from './ui/Overlay'
import { createScene, renderScene, startSceneLoop, stopSceneLoop, resizeScene } from './webgl/Scene'
import scenariosData from './data/scenarios.json'
import eventsData from './data/events.json'
import type { GameEvent } from './state/GameState'

const scenarios = scenariosData as Scenario[]
const eventsPool = eventsData as GameEvent[]

export interface SharedServices {
  sound?: { play?: (id: string) => void }
}

export interface BudgetGameAPI {
  init: (containerEl: HTMLElement, sharedServices?: SharedServices) => void
  start: () => void
  pause: () => void
  resume: () => void
  destroy: () => void
}

const DEFAULT_CONFIG = {
  months: 6,
  difficulty: 'normal' as GameState['config']['difficulty'],
  seed: 'demo',
  scenarioId: 'entry_level',
}

export function createBudgetGame(): BudgetGameAPI {
  let state: GameState | null = null
  let container: HTMLElement | null = null
  let overlayTeardown: (() => void) | null = null
  let scene: ReturnType<typeof createScene> | null = null
  let resizeObserver: ResizeObserver | null = null
  let sharedServices: SharedServices = {}
  let paused = false
  let sceneLoopStarted = false

  function getState(): GameState {
    if (!state) throw new Error('Game not initialized')
    return state
  }

  function dispatch(action: GameAction) {
    if (!state) return
    state = gameReducer(state, action)
    if (container) {
      triggerRender(container)
      if (scene) renderScene(scene, state)
    }
  }

  function startNewGame(config: typeof DEFAULT_CONFIG) {
    const scenario = scenarios.find((s) => s.id === config.scenarioId) ?? scenarios[1]
    dispatch({ type: 'INIT', config, scenario })
    runMonthStart()
  }

  function runMonthStart() {
    const s = getState()
    if (s.currentMonth > s.config.months) {
      dispatch({ type: 'SET_PHASE', phase: 'ended' })
      return
    }
    applyMonthStart(s, dispatch)
    dispatch({ type: 'SET_PHASE', phase: 'budget' })
  }

  function onConfirmBudget(categories: import('./state/GameState').BudgetCategory[]) {
    dispatch({ type: 'SET_BUDGET', categories })
    const s = getState()
    const count = Math.min(5, Math.max(2, Math.floor(2 + s.currentMonth * 0.5)))
    const events = pickEventsForMonth(eventsPool, s.config.seed, s.currentMonth, count, s.config.difficulty)
    dispatch({ type: 'SET_EVENT_QUEUE', events })
    dispatch({ type: 'SET_PHASE', phase: 'events' })
    processNextEvent()
  }

  function processNextEvent() {
    const s = getState()
    if (s.eventQueue.length === 0) {
      applyMonthEnd(s, dispatch)
      dispatch({ type: 'SET_PHASE', phase: 'summary' })
      return
    }
    const [next, ...rest] = s.eventQueue
    dispatch({ type: 'SET_EVENT_QUEUE', events: rest })
    dispatch({ type: 'SET_CURRENT_EVENT', event: next })
  }

  function onEventChoice(choice: import('./state/GameState').GameEventChoice) {
    const s = getState()
    applyChoice(s, choice, dispatch)
    if (container) triggerToast(container, (getState() as any).lastChoiceResult || 'Done')
    setTimeout(() => {
      if (getState().currentEvent) return
      processNextEvent()
    }, 100)
  }

  function onNextMonth() {
    runMonthStart()
  }

  function onStartGame(config: { months: number; difficulty: GameState['config']['difficulty']; seed: string; scenarioId: string }) {
    startNewGame({
      months: config.months,
      difficulty: config.difficulty,
      seed: config.seed,
      scenarioId: config.scenarioId,
    })
  }

  function doPause() {
    paused = true
    if (scene) stopSceneLoop(scene)
    sceneLoopStarted = false
  }

  function doResume() {
    paused = false
    if (scene && !sceneLoopStarted) {
      startSceneLoop(scene, getState)
      sceneLoopStarted = true
    }
  }

  return {
    init(containerEl: HTMLElement, shared?: SharedServices) {
      container = containerEl
      sharedServices = shared ?? {}
      container.innerHTML = ''
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;'
      container.appendChild(canvas)
      const overlayDiv = document.createElement('div')
      overlayDiv.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;z-index:20;pointer-events:auto;'
      container.appendChild(overlayDiv)
      scene = createScene(canvas)
      resizeObserver = new ResizeObserver(() => {
        if (scene) resizeScene(scene)
      })
      resizeObserver.observe(canvas)
      const scenario = scenarios.find((s) => s.id === DEFAULT_CONFIG.scenarioId) ?? scenarios[1]
      state = createInitialState(DEFAULT_CONFIG, scenario)
      overlayTeardown = buildOverlay(overlayDiv, getState, dispatch, {
        onConfirmBudget,
        onEventChoice,
        onNextMonth,
        onCloseSummary: () => dispatch({ type: 'SET_PHASE', phase: 'budget' }),
        onStartGame,
        onPause: doPause,
        onResume: doResume,
      })
      triggerRender(container)
    },

    start() {
      if (!state) {
        const scenario = scenarios.find((s) => s.id === DEFAULT_CONFIG.scenarioId) ?? scenarios[1]
        state = createInitialState(DEFAULT_CONFIG, scenario)
      }
      if (container) {
        triggerRender(container)
        getOverlayRoot(container)?.focus()
      }
      if (scene && !sceneLoopStarted) {
        startSceneLoop(scene, getState)
        sceneLoopStarted = true
      }
      runMonthStart()
    },

    pause: doPause,
    resume: doResume,

    destroy() {
      resizeObserver?.disconnect()
      resizeObserver = null
      if (scene) {
        stopSceneLoop(scene)
        scene = null
      }
      sceneLoopStarted = false
      overlayTeardown?.()
      overlayTeardown = null
      container = null
      state = null
    },
  }
}
