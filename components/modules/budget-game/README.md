# Budget Game

Single-player budgeting simulation with month-by-month progression. Teaches budgeting via fixed expenses, variable spending, savings, emergency events, and credit usage.

## Structure

- **index.ts** – Entry point; implements lifecycle: `init(containerEl, sharedServices)`, `start()`, `pause()`, `resume()`, `destroy()`.
- **state/GameState.ts** – Types and `createInitialState(config, scenario)`.
- **state/reducer.ts** – Pure state updates (actions + reducer).
- **engine/MonthEngine.ts** – Month start (income, fixed expenses, interest) and month end (min payment, late fee, history).
- **engine/EventEngine.ts** – Load events, pick with seeded RNG, apply choice effects.
- **engine/Scoring.ts** – Savings Health, Credit Score, Quality of Life, Overall Score.
- **engine/seededRng.ts** – Seeded PRNG for deterministic events (same seed => same sequence).
- **ui/Overlay.ts** – Builds DOM overlay: header, budget allocator, event cards, summary, ledger, settings.
- **webgl/Scene.ts** – WebGL background + charts (net worth line, credit gauge, QoL meter).
- **data/events.json** – Event definitions (id, title, description, type, choices with effects).
- **data/scenarios.json** – Scenarios (student, entry-level, family) with income, fixed expenses, starting balances.

## Scoring

- **Savings Health (0–100):** Total savings + emergency fund vs monthly expenses (months of coverage, capped).
- **Credit Score (300–850):** Affected by utilization, on-time/minimum payments, missed payments, late fees.
- **Quality of Life (0–100):** Lifestyle choices and whether essentials are met.
- **Overall:** 35% Savings Health + 35% (normalized credit) + 30% QoL.

Credit: Debt accrues interest monthly (e.g. 24% APR). Minimum payment required; missing it reduces credit score and adds a late fee. Paying down debt improves score slowly.

## Adding Events

Edit `data/events.json`. Each event has:

- `id`, `title`, `description`
- `type`: `unexpected_expense` | `unexpected_income` | `lifestyle_choice` | `credit_offer` | `fee_penalty`
- `choices`: array of `{ id, label, effects }`
- Each effect: `{ type: "cash" | "savings" | "emergency_fund" | "debt" | "credit_score" | "quality_of_life", amount: number }`

Use negative amounts for expenses (e.g. `{ type: "cash", amount: -50 }`).

## Adding Scenarios

Edit `data/scenarios.json`. Each scenario has:

- `id`, `name`, `description`
- `monthlyIncome`, `fixedExpenses` (array of `{ id, name, amount }`)
- `startingCash`, `startingSavings`, `startingEmergencyFund`, `startingDebt`
- `startingCreditScore`, `startingQualityOfLife`

## Running a Test Game

Use seed `"demo"` and 6 months for a reproducible run. Settings are in the overlay (Settings tab): months (6/12), difficulty (easy/normal/hard), seed, scenario.

## Integration

The game is registered in the dashboard as module 6 (Budget Game). The React wrapper `BudgetGame.tsx` mounts the game container, calls `createBudgetGame()`, then `init(container)` and `start()` on mount, and `destroy()` on unmount.
