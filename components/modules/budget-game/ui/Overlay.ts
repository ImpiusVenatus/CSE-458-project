/**
 * Budget Game - Overlay UI: build DOM, bind events
 */

import type { GameState, GameEvent, GameEventChoice, BudgetCategory, Scenario } from '../state/GameState'
import type { GameAction } from '../state/reducer'
import { getScoreBreakdown } from '../engine/Scoring'
import scenariosData from '../data/scenarios.json'

const scenarios = scenariosData as Scenario[]

export interface OverlayCallbacks {
  onConfirmBudget: (categories: BudgetCategory[]) => void
  onEventChoice: (choice: GameEventChoice) => void
  onNextMonth: () => void
  onCloseSummary: () => void
  onStartGame: (config: { months: number; difficulty: GameState['config']['difficulty']; seed: string; scenarioId: string }) => void
  onPause: () => void
  onResume: () => void
}

export function buildOverlay(
  container: HTMLElement,
  getState: () => GameState,
  dispatch: (a: GameAction) => void,
  callbacks: OverlayCallbacks
): () => void {
  const root = document.createElement('div')
  root.className = 'budget-game-overlay'
  root.setAttribute('tabindex', '-1')
  root.innerHTML = `
    <div class="bg-header" data-panel="header"></div>
    <div class="bg-main" data-panel="main"></div>
    <div class="bg-modal" data-panel="modal" hidden></div>
    <div class="bg-toast" data-panel="toast" hidden></div>
  `
  container.appendChild(root)
  ;(root as any).__getState = getState

  const styles = document.createElement('style')
  styles.textContent = getOverlayStyles()
  root.appendChild(styles)

  function render() {
    const state = getState()
    renderHeader(root.querySelector('[data-panel="header"]')!, state, callbacks)
    renderMain(root.querySelector('[data-panel="main"]')!, state, callbacks)
  }

  function showToast(message: string) {
    const el = root.querySelector('[data-panel="toast"]') as HTMLElement
    if (!el) return
    el.textContent = message
    el.hidden = false
    setTimeout(() => { el.hidden = true }, 2500)
  }

  const unsub = { render, showToast }
  ;(root as any).__bgUnsub = unsub

  render()
  return () => {
    container.removeChild(root)
  }
}

function getOverlayStyles(): string {
  return `
    .budget-game-overlay { position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; }
    .budget-game-overlay * { box-sizing: border-box; }
    .bg-header, .bg-main, .bg-panel { pointer-events: auto; }
    .bg-header { padding: 12px 16px; background: rgba(255,255,255,0.95); border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .bg-main { flex: 1; overflow: auto; padding: 16px; }
    .bg-panel { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 20px; margin-bottom: 16px; max-width: 560px; margin-left: auto; margin-right: auto; }
    .bg-panel h3 { margin: 0 0 12px 0; font-size: 1.1rem; color: #1f2937; }
    .bg-balances { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
    .bg-balance-item { background: #f3f4f6; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; }
    .bg-balance-item span { display: block; font-weight: 600; color: #374151; }
    .bg-balance-item .val { color: #059669; }
    .bg-balance-item .val.negative { color: #dc2626; }
    .bg-categories { display: flex; flex-direction: column; gap: 10px; }
    .bg-cat-row { display: flex; align-items: center; gap: 8px; }
    .bg-cat-row label { flex: 0 0 120px; font-size: 0.9rem; }
    .bg-cat-row input { flex: 1; max-width: 120px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
    .bg-buttons { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .bg-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.9rem; }
    .bg-btn-primary { background: #f59e0b; color: #fff; }
    .bg-btn-primary:hover { background: #d97706; }
    .bg-btn-secondary { background: #e5e7eb; color: #374151; }
    .bg-btn-secondary:hover { background: #d1d5db; }
    .bg-event-card { padding: 20px; }
    .bg-event-card h4 { margin: 0 0 8px 0; font-size: 1rem; }
    .bg-event-card p { margin: 0 0 16px 0; color: #6b7280; font-size: 0.9rem; }
    .bg-event-choices { display: flex; flex-wrap: wrap; gap: 8px; }
    .bg-modal[hidden] { display: none !important; }
    .bg-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 20; pointer-events: auto; }
    .bg-modal-inner { background: #fff; border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; max-height: 90vh; overflow: auto; }
    .bg-modal-inner h3 { margin: 0 0 16px 0; }
    .bg-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1f2937; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; z-index: 30; pointer-events: none; }
    .bg-ledger-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .bg-ledger-table th, .bg-ledger-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .bg-ledger-table th { background: #f9fafb; font-weight: 600; }
    .bg-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .bg-tab { padding: 6px 12px; border-radius: 6px; border: none; background: #e5e7eb; cursor: pointer; font-size: 0.85rem; }
    .bg-tab.active { background: #f59e0b; color: #fff; }
    .bg-settings label { display: block; margin-bottom: 4px; font-size: 0.9rem; }
    .bg-settings select, .bg-settings input { margin-bottom: 12px; padding: 6px 8px; width: 100%; max-width: 200px; }
  `
}

function renderHeader(el: HTMLElement, state: GameState, callbacks: OverlayCallbacks) {
  const root = el.closest('.budget-game-overlay')
  const mainPanel = root?.querySelector('[data-panel="main"]')
  const isPaused = (el as any).__bgPaused ?? false
  const tab = (mainPanel as any)?.__bgTab ?? (el as any).__bgTab ?? 'game'
  el.innerHTML = `
    <div>
      <strong>Month ${state.currentMonth}</strong> / ${state.config.months}
      ${state.phase === 'ended' ? ' (Game Over)' : ''}
    </div>
    <div class="bg-balances" style="display:flex;gap:12px;">
      <span>Cash: $${state.cashBalance.toFixed(0)}</span>
      <span>Savings: $${state.savingsBalance.toFixed(0)}</span>
      <span>Emergency: $${state.emergencyFundBalance.toFixed(0)}</span>
      <span class="${state.debtBalance > 0 ? 'val negative' : ''}">Debt: $${state.debtBalance.toFixed(0)}</span>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="bg-tab ${tab === 'game' ? 'active' : ''}" data-tab="game">Game</button>
      <button class="bg-tab ${tab === 'ledger' ? 'active' : ''}" data-tab="ledger">Ledger</button>
      <button class="bg-tab ${tab === 'settings' ? 'active' : ''}" data-tab="settings">Settings</button>
      ${state.phase !== 'ended' ? (isPaused ? '<button class="bg-btn bg-btn-primary" data-resume>Resume</button>' : '<button class="bg-btn bg-btn-secondary" data-pause>Pause</button>') : ''}
    </div>
  `
  el.querySelector('[data-pause]')?.addEventListener('click', () => { (el as any).__bgPaused = true; callbacks.onPause() })
  el.querySelector('[data-resume]')?.addEventListener('click', () => { (el as any).__bgPaused = false; callbacks.onResume() })
  el.querySelectorAll('[data-tab]').forEach((b) => {
    b.addEventListener('click', () => {
      const t = (b as HTMLElement).dataset.tab!
      const root = el.closest('.budget-game-overlay')
      const main = root?.querySelector('[data-panel="main"]') as HTMLElement
      if (main) (main as any).__bgTab = t
      const getState = (root as any)?.__getState
      const st = getState?.()
      if (st) {
        renderHeader(el, st, callbacks)
        if (main) renderMain(main, st, callbacks)
      }
    })
  })
  ;(el as any).__getState = () => (el.closest('.budget-game-overlay') as any)?.__getState?.()
}

function renderMain(el: HTMLElement, state: GameState, callbacks: OverlayCallbacks) {
  const tab = (el as any).__bgTab ?? 'game'
  ;(el as any).__getState = () => (el.closest('.budget-game-overlay') as any)?.__getState?.()

  if (tab === 'ledger') {
    el.innerHTML = `
      <div class="bg-panel">
        <h3>Transaction Ledger</h3>
        <table class="bg-ledger-table">
          <thead><tr><th>Month</th><th>Label</th><th>Amount</th><th>Balance After</th></tr></thead>
          <tbody>
            ${state.ledger.slice(-50).reverse().map((e) => `
              <tr>
                <td>${e.month}</td>
                <td>${e.label}</td>
                <td>${e.amount >= 0 ? '+' : ''}$${e.amount.toFixed(2)}</td>
                <td>$${e.balanceAfter.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    return
  }

  if (tab === 'settings') {
    el.innerHTML = `
      <div class="bg-panel bg-settings">
        <h3>Settings</h3>
        <label>Months</label>
        <select data-setting-months>
          <option value="6" ${state.config.months === 6 ? 'selected' : ''}>6</option>
          <option value="12" ${state.config.months === 12 ? 'selected' : ''}>12</option>
        </select>
        <label>Difficulty</label>
        <select data-setting-difficulty>
          <option value="easy" ${state.config.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="normal" ${state.config.difficulty === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="hard" ${state.config.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
        </select>
        <label>Seed</label>
        <input type="text" data-setting-seed value="${state.config.seed}" placeholder="e.g. demo" />
        <label>Scenario</label>
        <select data-setting-scenario>
          ${scenarios.map((s) => `<option value="${s.id}" ${state.config.scenarioId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <div class="bg-buttons">
          <button class="bg-btn bg-btn-primary" data-start>Start New Game</button>
        </div>
      </div>
    `
    el.querySelector('[data-start]')?.addEventListener('click', () => {
      const months = parseInt((el.querySelector('[data-setting-months]') as HTMLSelectElement)?.value || '6', 10)
      const difficulty = ((el.querySelector('[data-setting-difficulty]') as HTMLSelectElement)?.value || 'normal') as GameState['config']['difficulty']
      const seed = (el.querySelector('input[data-setting-seed]') as HTMLInputElement)?.value || 'demo'
      const scenarioId = (el.querySelector('select[data-setting-scenario]') as HTMLSelectElement)?.value || 'entry_level'
      callbacks.onStartGame({ months, difficulty, seed, scenarioId })
    })
    return
  }

  if (state.phase === 'ended') {
    const breakdown = getScoreBreakdown(state)
    el.innerHTML = `
      <div class="bg-panel">
        <h3>Game Over – Final Scores</h3>
        <p>Savings Health: ${breakdown.savingsHealth}/100</p>
        <p>Credit Score: ${breakdown.creditScore}</p>
        <p>Quality of Life: ${breakdown.qualityOfLife}/100</p>
        <p><strong>Overall: ${breakdown.overall}/100</strong></p>
        <div class="bg-buttons">
          <button class="bg-btn bg-btn-primary" data-settings>Back to Settings</button>
        </div>
      </div>
    `
    ;(el as any).__bgTab = 'settings'
    el.querySelector('[data-settings]')?.addEventListener('click', () => {
      ;(el as any).__bgTab = 'settings'
      renderMain(el, state, callbacks)
    })
    return
  }

  if (state.currentEvent) {
    renderEventCard(el, state.currentEvent, callbacks.onEventChoice)
    return
  }

  if (state.phase === 'summary') {
    const breakdown = getScoreBreakdown(state)
    el.innerHTML = `
      <div class="bg-panel">
        <h3>End of Month ${state.currentMonth}</h3>
        <p>Savings Health: ${breakdown.savingsHealth} | Credit: ${breakdown.creditScore} | QoL: ${breakdown.qualityOfLife}</p>
        <div class="bg-buttons">
          <button class="bg-btn bg-btn-primary" data-next>Next Month</button>
        </div>
      </div>
    `
    el.querySelector('[data-next]')?.addEventListener('click', callbacks.onNextMonth)
    return
  }

  renderBudgetAllocator(el, state, callbacks.onConfirmBudget)
}

function renderBudgetAllocator(el: HTMLElement, state: GameState, onConfirm: (categories: BudgetCategory[]) => void) {
  const totalIncome = state.monthlyIncome - state.fixedExpenses.reduce((s, e) => s + e.amount, 0)
  const categories = state.variableCategories
  el.innerHTML = `
    <div class="bg-panel">
      <h3>Budget Allocation – Month ${state.currentMonth}</h3>
      <p>Income after fixed: $${totalIncome.toFixed(0)}</p>
      <p><strong>Fixed expenses:</strong></p>
      <ul style="margin:0 0 12px 0; padding-left:20px;">
        ${state.fixedExpenses.map((e) => `<li>${e.name}: $${e.amount}</li>`).join('')}
      </ul>
      <div class="bg-categories">
        ${categories.map((c) => `
          <div class="bg-cat-row">
            <label>${c.name}</label>
            <input type="number" min="0" step="10" data-cat-id="${c.id}" value="${c.allocated}" />
          </div>
        `).join('')}
      </div>
      <p class="bg-total" style="margin-top:12px;">Total allocated: $<span data-total>0</span></p>
      <div class="bg-buttons">
        <button class="bg-btn bg-btn-primary" data-confirm>Confirm Budget</button>
      </div>
    </div>
  `
  const inputs = el.querySelectorAll<HTMLInputElement>('input[data-cat-id]')
  const totalEl = el.querySelector('[data-total]')
  function updateTotal() {
    let t = 0
    inputs.forEach((i) => { t += Number(i.value) || 0 })
    if (totalEl) totalEl.textContent = t.toFixed(0)
  }
  inputs.forEach((i) => i.addEventListener('input', updateTotal))
  updateTotal()

  el.querySelector('[data-confirm]')?.addEventListener('click', () => {
    const next: BudgetCategory[] = categories.map((c) => {
      const input = el.querySelector<HTMLInputElement>(`input[data-cat-id="${c.id}"]`)
      return { ...c, allocated: Number(input?.value) || 0 }
    })
    const sum = next.reduce((s, c) => s + c.allocated, 0)
    if (sum > totalIncome) return alert('Total allocation cannot exceed income after fixed expenses.')
    onConfirm(next)
  })
}

function renderEventCard(el: HTMLElement, event: GameEvent, onChoice: (choice: GameEventChoice) => void) {
  el.innerHTML = `
    <div class="bg-panel bg-event-card">
      <h4>${event.title}</h4>
      <p>${event.description}</p>
      <div class="bg-event-choices">
        ${event.choices.map((c) => `<button class="bg-btn bg-btn-primary" data-choice-id="${c.id}">${c.label}</button>`).join('')}
      </div>
    </div>
  `
  event.choices.forEach((choice) => {
    el.querySelector(`[data-choice-id="${choice.id}"]`)?.addEventListener('click', () => onChoice(choice))
  })
}

export function getOverlayRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.budget-game-overlay')
}

export function triggerRender(container: HTMLElement) {
  const root = getOverlayRoot(container)
  const unsub = (root as any)?.__bgUnsub
  if (unsub?.render) unsub.render()
}

export function triggerToast(container: HTMLElement, message: string) {
  const root = getOverlayRoot(container)
  const unsub = (root as any)?.__bgUnsub
  if (unsub?.showToast) unsub.showToast(message)
}
