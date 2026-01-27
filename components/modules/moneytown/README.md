# MoneyTown (Milestone 1)

Kid-friendly board game (Monopoly-lite) to teach money. Players roll dice, move on a 24-tile board, and tiles trigger simple earn/spend actions.

## Milestone 1 – Implemented

- **Menu entry:** "MoneyTown" in Learning Modules (dashboard sidebar).
- **WebGL board:** 24 tiles in a rectangle loop (6 per side). Each tile is a colored rectangle; tile 0 (Start) is green, tile 6 (Shop) is red, others alternate light purple/blue. Tile labels 0–23 are drawn in the HTML overlay over each tile.
- **Tokens & dice:** 2 player tokens (blue and orange circles) on the board; a 2D dice square in the top-right (value shown in HUD).
- **Turn system:** Player 1 then Player 2. "Roll" button rolls 1–6. Token moves tile-by-tile to the destination with a short delay per step. When movement finishes, the HUD shows "Landed on Tile X".
- **Tile effects (2 only):**
  - **Tile 0 (Start):** +50 coins when you pass or land on it.
  - **Tile 6 (Shop):** -20 coins when you land on it.
- **HUD (overlay):** Current player, last dice result, cash for P1 and P2, "Roll" button (disabled during move animation), and the last "Landed on Tile X" message.
- **Determinism:** Seeded LCG in game state; default seed `"demo"`.

## How to run

1. Start the app: `npm run dev`.
2. Open the dashboard, sign in if needed.
3. Click **MoneyTown** in the Learning Modules sidebar.
4. Click **Roll** to roll the dice; the current player’s token moves, then the turn switches.

## File structure

- `index.ts` – Lifecycle: init/start/pause/resume/destroy; wires canvas, WebGL renderer, HUD, roll handler, and move animation.
- `state.ts` – Game state types and initial state (seed, players, dice, phase, etc.).
- `rng.ts` – Seeded LCG; state stored in game state for determinism.
- `engine.ts` – Turn order, roll, step-by-step movement, pass/land logic, tile effects (0 and 6).
- `webgl/renderer.ts` – WebGL: board tiles, player tokens, dice square. Uses shared `lib/webgl-utils` and `lib/webgl-shapes`. Coordinate mapping: tiles 0–23 run clockwise along the perimeter (bottom, right, top, left).
- `ui/hud.ts` – HTML overlay: current player, dice, cash, Roll button, landed message, and 24 tile number labels positioned over the board.

## Coordinate mapping (tiles)

Board is a rectangle with margin. Tiles are on the perimeter:

- **Tiles 0–5:** Bottom edge, left to right.
- **Tiles 6–11:** Right edge, bottom to top.
- **Tiles 12–17:** Top edge, right to left.
- **Tiles 18–23:** Left edge, top to bottom.

Same mapping is used in `webgl/renderer.ts` (for drawing) and `ui/hud.ts` (for label positions).

## Next milestones (not in M1)

- Chance cards, investments, savings, quizzes.
- Endgame: highest Net Worth after fixed rounds.
- More tile types and effects.
