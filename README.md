# Chess Coach (React + Vite)

Play against an adjustable-strength Stockfish AI (ELO up to 3000), choose blitz/rapid/classical time controls, peek at best-move suggestions, and review post-game analysis in the browser.

## Quick start

```bash
npm install
npm run dev
# open the printed localhost URL
```

## Scripts

- `npm run dev` — start Vite dev server.
- `npm run build` — type-check and build for production.
- `npm run test` — run unit tests with Vitest.

## Notes

- The bundled Stockfish worker uses the lite single-threaded WASM build to avoid cross-origin isolation; Vite will log that `fs/path/worker_threads/readline` are externalized for browser compatibility. This is expected and safe.
- Best-move hints and post-game analysis run locally in the browser—no backend needed. If the engine fails to load, refresh and ensure your browser supports WASM.
