# Chess Coach Web App ExecPlan

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. There is no PLANS.md in this repository; this file defines the required process and structure.

## Purpose / Big Picture

Deliver a browser-based chess coach where a user can play against an AI whose strength can be adjusted up to an ELO ceiling of 3000, request best-move suggestions during play, choose time controls from blitz to classical, and receive post-game analysis highlighting mistakes with teaching notes. Success means someone can start the app locally, select an AI ELO and time format, play a full game on an interactive board, optionally reveal the engine’s best move, and at game end see a summary of inaccuracies, mistakes, and blunders with recommended improvements.

## Progress

- [x] (2025-11-23 14:44Z) Drafted initial ExecPlan with architecture, milestones, and validation steps.
- [x] (2025-11-23 14:57Z) Scaffolded Vite React TS project and installed base deps (`chess.js`, `react-chessboard`, `stockfish`).
- [x] (2025-11-23 15:11Z) Integrated Stockfish worker/client with adjustable ELO, time-aware search, and hint/eval plumbing.
- [x] (2025-11-23 15:11Z) Built playable board UI with clocks, controls, best-move toggle, and initial post-game analysis panel.
- [x] (2025-11-23 15:24Z) Added initial unit tests (analysis thresholds, engine messaging, controls render) and project README/run notes.
- [ ] Polish UX and broaden tests as features grow.

## Surprises & Discoveries

- Observation: The `stockfish` npm package lacks a clean ESM entry; importing the lite single-threaded hashed build directly works with Vite, though it logs externalized Node modules during build. Evidence: Vite build warnings about `fs`, `path`, `worker_threads`.

## Decision Log

- Decision: Use React + TypeScript via Vite for fast local dev, with `react-chessboard` for the board UI and `chess.js` for rules/PGN handling. Rationale: minimal boilerplate, strong typing, widely used chess libs that simplify move validation/rendering. Date/Author: 2025-11-23 Codex.
- Decision: Use `stockfish.wasm` (or `stockfish` npm package that bundles WASM) in a Web Worker, enabling `UCI_LimitStrength` and `UCI_Elo` up to 3000 plus `MoveTime` or depth to simulate time controls. Rationale: Runs fully in-browser, exposes UCI options needed for adjustable strength and timed searches. Date/Author: 2025-11-23 Codex.
- Decision: Represent time controls via presets (e.g., 3+2 blitz, 10+5 rapid, 30+0 classical) with custom option; drive clocks client-side and pause during engine computation to keep fairness. Rationale: Matches user request for blitz-to-classical flexibility while keeping logic simple. Date/Author: 2025-11-23 Codex.
- Decision: Post-game analysis will replay the PGN through Stockfish at fixed depth/time per move, classifying deltas (best move eval vs played move eval) into inaccuracy/mistake/blunder thresholds and generating concise advice strings. Rationale: No backend available; reuse engine locally for explainability. Date/Author: 2025-11-23 Codex.
- Decision: Import the lite single-threaded Stockfish build directly (`stockfish-17.1-lite-single-...`) inside the Web Worker to avoid cross-origin isolation requirements while keeping bundle size reasonable. Rationale: Simplifies Vite bundling and runs in browser-only context. Date/Author: 2025-11-23 Codex.

## Outcomes & Retrospective

- To be filled after milestones; will summarize achieved features, remaining gaps, and lessons learned versus the Purpose.

## Context and Orientation

Repository is currently empty. All work will be added under the root. We will create a Vite React TypeScript app in `./` with source under `src/`. Key planned files: `src/main.tsx` for app bootstrap, `src/App.tsx` as layout, `src/engine/stockfishWorker.ts` for Web Worker glue to Stockfish WASM, `src/engine/engineClient.ts` for a typed interface to send UCI commands, `src/chess/clock.ts` for time control utilities, `src/chess/analysis.ts` for post-game evaluation, `src/components/Board.tsx` for the interactive board, `src/components/Controls.tsx` for settings (ELO, time, toggles), `src/components/Sidebar.tsx` for move list and hints, and `src/components/AnalysisPanel.tsx` for post-game feedback. Tests will live under `src/__tests__/`.

## Plan of Work

Begin by scaffolding a Vite React TypeScript project and installing dependencies: `react-chessboard`, `chess.js`, `stockfish` (WASM build), and utility libs as needed. Establish a Web Worker wrapper around Stockfish that supports messages for: set ELO (via `UCI_LimitStrength` and `UCI_Elo`), set search constraints (movetime or depth), request best move (returns move and evaluation), and analyze move list (returns per-ply evals). Build a top-level state container that tracks game state (FEN, history, clocks, player to move, hint visibility). Implement a clock manager that decrements active player time using `requestAnimationFrame` or `setInterval`, pausing while awaiting engine move if desired. Create UI: main board, controls for side-to-move color, AI ELO slider (400–3000 with step granularity), time control selector (preset buttons and custom inputs), toggle for best-move hints, and a panel showing current evaluation and suggested move when enabled. Implement gameplay: user clicks/drag moves on `react-chessboard`; valid moves are applied via `chess.js`; engine move is requested with current ELO and remaining time influencing search time (e.g., allocate a fraction of remaining clock or fixed per-move milliseconds based on time format). When game ends (checkmate, draw, flag), stop clocks and trigger analysis: send PGN to analysis helper that iterates positions, queries engine at a fixed depth or movetime (shorter for blitz, longer for classical), classifies errors (e.g., inaccuracy if delta > 0.3, mistake > 1.0, blunder > 2.0 pawns), and returns advice text stored alongside move list. Render analysis results in `AnalysisPanel` with collapsible sections for major mistakes and suggested improvements. Add light styling and responsiveness so the board and side panels adapt on mobile. Provide npm scripts for dev, build, and tests; add unit tests for engine client message formatting and analysis thresholds, and a simple render test for the App.

## Concrete Steps

Working directory for all commands: `/home/nkateko-dibakoane/Vault/02_Projects/chess`.

1. Initialize project and dependencies.
   - Run: `npm create vite@latest . -- --template react-ts`
   - Run: `npm install`
   - Run: `npm install chess.js react-chessboard stockfish`
   - Verify scaffold: `npm run dev -- --host` (expect Vite dev server message).

2. Set up Stockfish Web Worker and engine client.
   - Add `src/engine/stockfishWorker.ts` that instantiates the Stockfish WASM module, listens for messages (`init`, `setElo`, `setTimeControl`, `bestMove`, `analyzeMoves`), and posts responses.
   - Add `src/engine/engineClient.ts` that wraps `Worker`, exposes typed async functions `init()`, `setElo(elo: number)`, `setTimeControl({movetime?: number, depth?: number})`, `getBestMove(fen: string)`, `analyzeMoves(pgn: string, config)`; include timeout handling and queueing to avoid overlapping searches.
   - Test locally with a small script or temporary button that requests a best move from the starting position and logs the response.

3. Build chess core and clock utilities.
   - Add `src/chess/clock.ts` to manage countdown timers given increments; include methods to start/pause/reset and to emit remaining time for UI.
   - Add `src/chess/analysis.ts` with helper `classifyDelta(deltaPawns: number)` returning labels (accuracy/mild/mistake/blunder) and `analyzeGame(pgn, engineClient, config)` that iterates moves, gets evaluations, and returns structured advice.

4. Implement UI shell and gameplay.
   - Replace `src/App.tsx` with layout: header, controls sidebar, board area, bottom analysis/hint strip.
   - Create `src/components/Controls.tsx` with sliders/dropdowns for AI ELO (400–3000), time controls (3+2, 5+5, 10+0, 30+0, custom), color selection, and toggle for showing best move.
   - Create `src/components/Board.tsx` wrapping `react-chessboard`, integrating `chess.js` to validate/apply moves; when user moves, update state, start/stop clocks, and if game continues, request engine reply and apply it.
   - Add `src/components/Sidebar.tsx` for move list and current evaluation/hint (when toggled).
   - Wire state in `App.tsx`: manage `Chess` instance, `engineClient`, clocks, game status, hint state, and analysis trigger at game end.

5. Add post-game analysis UI.
   - Create `src/components/AnalysisPanel.tsx` to render list of mistakes with move numbers, difference scores, and advice; include button to re-run analysis if settings change (depth/time).
   - Provide a simple “teach” text per classification (e.g., “Develop pieces before pawn moves in the opening” for blunders detected early).

6. Styling and responsiveness.
   - Add `src/App.css` (or `src/styles.css`) to make a clean two-column layout on desktop, stacked on mobile. Ensure board scales to container and controls are touch-friendly.

7. Tests and validation.
   - Add unit tests under `src/__tests__/analysis.test.ts` for classification thresholds.
   - Add `src/__tests__/engineClient.test.ts` mocking Worker to ensure messages carry correct options (ELO, movetime).
   - Add a basic render test for `App` using React Testing Library.
   - Run `npm test` and `npm run build`.
   - Manual validation: start dev server, play a quick game, toggle best move to see suggestion, set different ELOs (e.g., 800 vs 2500) to confirm engine strength changes (observe response time/quality), and run a post-game analysis to view mistake list.

8. Wrap up.
   - Update this plan’s `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.
   - Document run commands in `README.md` (create if absent).

## Validation and Acceptance

The change is accepted when a user can run `npm install`, then `npm run dev`, open the served URL, and: (1) choose an AI ELO up to 3000 and time control, (2) play a full game on the board with clocks ticking, (3) toggle “Show best move” to see a suggested move from the engine on demand, and (4) after game end, view an analysis panel that lists at least one categorized mistake with advice. Automated acceptance: `npm run build` succeeds and tests under `npm test` pass.

## Idempotence and Recovery

Running the setup commands multiple times is safe; `npm install` is idempotent. If the dev server crashes, re-run `npm run dev`. If Stockfish fails to load, re-run the app after clearing cache; the worker initialization should reject with an error to help debug. Analysis runs can be retried at any time because they derive from saved PGN.

## Artifacts and Notes

Add brief command outputs or short code excerpts here as work proceeds to document evidence (e.g., example engine response for best move). Keep them concise and indented.

## Interfaces and Dependencies

Key libraries: `react`, `react-dom`, `typescript`, `vite`, `chess.js`, `react-chessboard`, `stockfish` (WASM build). Expected interfaces:

- `src/engine/engineClient.ts`
    - `init(): Promise<void>`
    - `setElo(elo: number): Promise<void>` where elo is clamped 400–3000 and relayed via `UCI_LimitStrength`/`UCI_Elo`.
    - `setTimeControl(opts: { movetime?: number; depth?: number }): Promise<void>` choosing movetime in ms or a fixed depth when time controls are long.
    - `getBestMove(fen: string): Promise<{ move: string; eval: number }>` returning SAN or UCI move and score in pawns.
    - `analyzeMoves(pgn: string, config: { movetime: number; maxPlies?: number }): Promise<AnalysisResult[]>` where `AnalysisResult` includes move number, side, best move, played move, score delta, and advice text.
- `src/chess/clock.ts`
    - `start(side: 'white' | 'black')`, `pause()`, `reset(initialMs, incrementMs)`, `tick(): { whiteMs: number; blackMs: number }` designed to be driven by requestAnimationFrame/setInterval.
- `src/chess/analysis.ts`
    - `classifyDelta(delta: number): 'ok' | 'inaccuracy' | 'mistake' | 'blunder'`
    - `buildAdvice(context) => string` to produce human-friendly guidance per classification and phase (opening/middlegame/endgame).

Note: Plan created on 2025-11-23 by Codex to establish the initial roadmap; future edits must note changes and reasons here.

Update 2025-11-23 14:57Z: Recorded project scaffolding and dependency installation completion; no behavior changes yet.
Update 2025-11-23 15:11Z: Added engine worker/client, interactive board with clocks/controls/hints, and analysis UI scaffold; build passing.
Update 2025-11-23 15:24Z: Added Vitest setup with unit tests and README instructions; build/test scripts updated.
