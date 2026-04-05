# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js 14 App Router project for interactive financial-learning games. Route files live in `app/` (`app/page.tsx`, `app/auth/page.tsx`, `app/dashboard/page.tsx`). Reusable game modules live in `components/modules/`; simple modules are single `.tsx` files, while larger games keep engine, state, UI, WebGL, and data files in subfolders such as `components/modules/budget-game/` and `components/modules/moneytown/`. Shared utilities, theme/progress context, and Supabase helpers live in `lib/`. Global styles are in `app/globals.css`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run lint`: run the Next.js lint check; use this before every PR.
- `npm run build`: create a production build and catch type/runtime integration issues.
- `npm run start`: serve the production build locally after `npm run build`.

There is no `npm test` script yet. Treat `lint` and `build` as the minimum validation gate.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode and the `@/*` import alias from `tsconfig.json`. Follow the existing style: 2-space indentation, single quotes, and no semicolons. Use `PascalCase` for React components (`MoneyTown.tsx`), `camelCase` for utilities (`progress-context.tsx`, `seededRng.ts`), and Next.js route file names like `page.tsx` and `route.ts`. Keep Tailwind utility usage close to the component; reserve `app/globals.css` for shared classes such as `.btn-primary` and `.card`.

## Testing Guidelines
Automated tests are not set up yet. For every change, run `npm run lint` and `npm run build`, then manually smoke-test the affected flow in the browser. For gameplay changes, verify the dashboard entry point plus the changed module’s main interactions, scoring/progression, and responsive behavior.

## Commit & Pull Request Guidelines
Recent history mostly uses short, imperative commits, often in Conventional Commit form like `feat(moneytown): add board game module`. Prefer `feat(scope): summary`, `fix(scope): summary`, or a similarly clear imperative message. PRs should include a concise description, linked issue or task, validation steps, and screenshots or GIFs for UI/gameplay updates.

## Security & Configuration Tips
Supabase configuration is read from `.env`, especially `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Do not commit real credentials. Changes to auth/session behavior should be reviewed in both `lib/supabase/` and `middleware.ts`.
