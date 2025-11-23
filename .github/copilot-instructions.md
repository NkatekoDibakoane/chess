<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repo -->

# Repo summary

This is a small React + TypeScript + Vite app that provides a chess coaching UI powered by Stockfish running inside a web worker.

- Frontend: `src/App.tsx`, `src/main.tsx` (React + `react-chessboard`).
- Engine: `src/engine/engineClient.ts` (promise-based wrapper) and `src/engine/stockfishWorker.ts` (web worker using the `stockfish` npm package).
- Game logic / analysis: `src/chess/*` (clock, analysis helpers).
- UI: `src/components/*` (Controls, Sidebar, AnalysisPanel).

# High-level architecture notes (important for code edits)

- The engine runs inside a Dedicated Web Worker. The worker file `src/engine/stockfishWorker.ts` imports the Stockfish bundle directly (`stockfish/src/stockfish-17.1-lite-single-03e3232.js`) and exposes a simple request/response queue.
- `EngineClient` (in `src/engine/engineClient.ts`) is the canonical façade for interacting with the engine. It:
  - Creates the Worker (unless injected via `options.worker`).
  - Sends requests with an `id` and stores pending promises in a `Map` with a 15s timeout.
  - Exposes `waitForReady()`, `setElo()`, `getBestMove()`, and `evaluate()`.
- Message shapes are explicit in both files — if you change types, update both worker and client.
- Evaluations: the worker parses Stockfish "info" lines and converts centipawns to pawn units (`cp / 100`). Mate is represented as +/-100 in the worker.
- Moves between the UI and engine are plain UCI strings (e.g., `e2e4` or `e7e8q`). `App` slices strings to build chess.js moves.

# Developer workflows & commands

- Install: `npm install` or `pnpm install`.
- Dev server: `npm run dev` (runs `vite`).
- Build: `npm run build` (runs `tsc -b && vite build`).
- Preview: `npm run preview`.
- Tests: `npm run test` (Vitest). `vite.config.ts` references `vitest.setup.ts` for test globals.
- Lint: `npm run lint` (ESLint configured in repo).

# Project-specific conventions & gotchas

- Worker bundling: The worker imports the Stockfish JS file directly. Changes to Stockfish version or the import path may require Vite config changes or adding an asset copy step. Prefer editing `src/engine/stockfishWorker.ts` when adjusting engine behaviour.
- Engine timeouts: `EngineClient.send` uses a 15s timeout for requests. Avoid blocking the worker longer than that without adjusting the timeout.
- Evaluation units: `stockfishWorker` converts centipawns to pawn units (e.g., 34 cp -> 0.34). `analysis.ts` expects `eval` in pawn units.
- Analysis delta/classification: `src/chess/analysis.ts` computes `delta = bestEval - actualEval` (perspective adjusted) and uses thresholds: <0.4 ok, <1.0 inaccuracy, <2.5 mistake, else blunder. If you change thresholds, tests or UI labels should be updated accordingly.
- Clock timing: `src/chess/clock.ts` uses `performance.now()` and milliseconds. `Controls` expects milliseconds for `TimeControl` values.
- UI patterns: `App` uses `useRef` for `EngineClient`, `Chess` instance and `ChessClock`. Mutating those refs is the expected pattern rather than re-instantiating on every render.

# Where to look for common change tasks (examples)

- To change engine options or add new engine requests: edit both `src/engine/engineClient.ts` and `src/engine/stockfishWorker.ts` and keep types in sync.
- To change how evaluations are interpreted: update `parseScore` in `stockfishWorker.ts` and `analyzeGame` in `src/chess/analysis.ts`.
- To change UI move application: `App` uses `applyUciMove` (slices UCI string); update there if switching to a different move format.
- To adjust analysis performance (movetime / maxPlies): `App` calls `analyzeGame(gameRef.current.pgn(), engine, { movetime, maxPlies })` — change defaults near this call or expose controls in `Controls`.

# How an AI agent should propose changes

- Keep worker/client message types and payload shapes in lock-step. Show both sides of the change in a single PR.
- Prefer minimal, targeted edits: update the worker and client interfaces together and include unit tests where applicable (Vitest).
- When touching timing, mention units (ms) and where clocks are used (`ChessClock` + app polling loop in `App`).
- If proposing to bump Stockfish or alter its import path, include a short manual test plan: `npm run dev` and exercise an engine request (start game and verify hint appears) and run tests.

# Quick references (files)

- Engine API: `src/engine/engineClient.ts` and `src/engine/stockfishWorker.ts`
- Analysis logic: `src/chess/analysis.ts`
- Clock: `src/chess/clock.ts`
- Top-level app: `src/App.tsx`
- Tests setup: `vitest.setup.ts` and `vite.config.ts`
- Package scripts: `package.json`

---
If any section is unclear or you'd like this tightened for a specific agent role (e.g., refactorer vs feature author vs test-writer), tell me which role and I'll iterate.
