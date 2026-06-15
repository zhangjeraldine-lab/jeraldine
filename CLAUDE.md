# CLAUDE.md — Co-Drawing Connections

This file orients Claude Code (and any AI assistant) to the project before it edits code. Read top-to-bottom for the first task in a session, then jump to the section you need.

---

## 1. What this project is

**共绘连接 / Co-Drawing Connections** is an airport-lounge interactive installation.
- A single large horizontal display sits on a charging table between two travelers facing each other.
- The screen is split down the middle: the **left half is rotated 180°** in CSS so it reads correctly to the person on the far side; the **right half** is normal-orientation for the person on the near side.
- Both halves run inside **the same browser window** — there is no networked pairing between separate devices for the core flow. Strokes drawn on one half are **mirrored** to the other half within the same canvas.
- A Socket.IO room (`layover-main`) is still used so additional terminals (or a tablet) can join and stay in sync.

Goal: turn boring layover time into a calm cross-cultural, cross-language micro-collaboration that the traveler can take with them.

Three core experiences (selected from `HomeScreen`):
1. **Co-Drawing (`drawing`)** — shared mirrored canvas with AI sketch recognition + AI hand-drawn variant generation (OpenAI).
2. **Language Game (`language-game`)** — one traveler draws a prompted word; the other traces the Chinese character stroke-by-stroke, then hears it pronounced in both languages.
3. **Voice Coach** — bilingual TTS guide overlaying every screen, with per-side panning (left ear vs right ear) so each traveler hears their own language.

---

## 2. Repo layout

```
co-drawing-connections/
├── frontend-terminal/      React 18 + Vite, the kiosk UI
├── backend/                Node.js + Express + Socket.IO
│   ├── relay.js            ★ lightweight relay used by the current build
│   └── src/index.js        elaborate matchmaking/SQLite server (Phase 1 architecture, not the primary entry)
├── ai-service/             Python FastAPI heuristic shape recognizer (legacy / fallback)
├── mobile-app/             placeholder for the share H5 (empty)
├── docs/                   architecture / API docs (placeholders)
└── docker-compose.yml      production wiring (uses backend/src/index.js)
```

**Two server entry points exist in `backend/` — this is the single most common source of confusion.** See §4.

---

## 3. The 180° rotation convention

Every "left panel" component wraps its inner content in a CSS-rotated container. Search for these class names when you need to find or fix it:
- `home-inner-rotated` ([frontend-terminal/src/components/HomeScreen.jsx](frontend-terminal/src/components/HomeScreen.jsx))
- `lg-inner-rotated` ([frontend-terminal/src/components/LanguageGameScreen.jsx](frontend-terminal/src/components/LanguageGameScreen.jsx))
- `panel-inner rotated` ([frontend-terminal/src/components/SplitLanguageScreen.jsx](frontend-terminal/src/components/SplitLanguageScreen.jsx))

In the drawing canvas, rotation is **not** applied to the canvas itself — instead, strokes are point-mirrored. See `mirrorPoints(points, W, H)` in [frontend-terminal/src/components/DrawingCanvas.jsx](frontend-terminal/src/components/DrawingCanvas.jsx). When you draw on the right half, the same stroke is also drawn on the left half at `(W - x, H - y)`. The two travelers feel like they share one canvas, but each sees their own side right-side-up.

When adding any new screen, follow the same pattern: split the layout into two halves, rotate the left inner content 180°, and provide per-side language props (`leftLanguage`, `rightLanguage` from `useAppStore`).

---

## 4. Backend: which file actually runs?

`backend/` ships two servers. **They are different programs.** Be sure which one is running before editing.

### `backend/relay.js` — the relay (current build)
- Minimal: Socket.IO room relay + OpenAI art routes + StepFun TTS proxy.
- Events relayed verbatim: `joinRoom`, `canvasStroke`, `strokePoint`, `canvasAction`.
- Routes registered: everything from `src/routes/openaiArtRoutes.js` (`/api/recognize`, `/api/generate-styles`, `/api/ai/styles`) plus `/api/tts`.
- Logs: `backend/relay.out.log`, `backend/relay.err.log`.
- Run directly: `node relay.js` (no `npm run` script for it).

### `backend/src/index.js` — the matchmaking server (Phase 1 architecture)
- Full queue/pairing, SQLite (`better-sqlite3`), themes, languages, automatic match check every 30s.
- Sockets: `enter`, `stroke`, `selectTheme`, `undo`, `clear`, `finishDrawing`, `getStats`, `matched`, `strokeBatch`, `queueUpdated`, `queueStats`.
- Run: `npm run dev` (= `nodemon src/index.js`).
- The frontend in its current form (`useWebSocket.jsx` + `DrawingCanvas.jsx`) talks to **`relay.js`** events (`canvasStroke`, `strokePoint`, `remoteStroke`, `remoteAction`), **not** to the `index.js` queue events. So if you launch `npm run dev` and nothing seems to sync, that's why.

**Rule of thumb:** unless you are intentionally working on the queue/SQLite path, run `relay.js`.

---

## 5. Frontend state model

State lives in **Zustand** ([frontend-terminal/src/store/index.js](frontend-terminal/src/store/index.js)):

`useAppStore`
- `userId` — uuid; stable within a tab.
- `appState` — `'selecting' | 'home' | 'drawing' | 'language-game'`. Initial value is `'selecting'` (split language picker). `App.jsx` switches screens on this.
- `leftLanguage`, `rightLanguage` — chosen on `SplitLanguageScreen`. Both are needed before `appState` moves to `'home'`.
- `gameMode` — `'drawing' | 'language'`.
- `sessionId`, `opponentLanguage`, `role` — populated only when using the matchmaking path (`src/index.js`).

`useDrawingStore` — local canvas tool state (color, tool, size, history). Currently only partly used; `DrawingCanvas.jsx` keeps most state in `useRef`s for performance.

`useWebSocket` ([frontend-terminal/src/hooks/useWebSocket.jsx](frontend-terminal/src/hooks/useWebSocket.jsx)) holds a **module-level singleton** `sharedSocket`. Every component that calls the hook gets the same connection. Do not create a second `io()` — listeners will multiply.

---

## 6. The drawing pipeline

In `DrawingCanvas.jsx`:

1. **Input** — pointer/touch events split by x-coordinate into `side: 'left' | 'right'`.
2. **Live local segment** — `applySegment(ctx, side, …, from, to)` draws the new segment on the source side AND on the mirrored side (`(W-x, H-y)` on the opposite half).
3. **Live network** — every 4 points, `strokePoint` is emitted with `meta` + last 5 points. The relay forwards as `remoteStrokePoint`.
4. **Stroke end** — `canvasStroke` is emitted with the full stroke `{id, side, tool, color, size, opacity, points, ts, shapeType?}`. The relay forwards as `remoteStroke`. The receiver re-applies the stroke (including the mirror) to keep deterministic state.
5. **Other actions** — `canvasAction` carries `type`: `undo | clear | style | recognize | generatedImageSelected`. The relay forwards as `remoteAction`. Each receiver mutates state accordingly.

Two redo stacks (`leftRedo`, `rightRedo`) are kept per side. Remote strokes are marked `remote: true` so `undoSide` skips them — each user can only undo their own work.

Shape snapping lives in [frontend-terminal/src/utils/shapeDetection.js](frontend-terminal/src/utils/shapeDetection.js). `detectShapeType` returns one of `line | curve | rect | diamond | triangle | pentagon | hexagon | polygon | star | heart | circle | ellipse | freehand | none`. Hard-cornered shapes are drawn with `lineTo`; soft ones use quadratic-curve smoothing.

---

## 7. AI features (OpenAI + StepFun)

All AI traffic goes through the backend so the API keys never leave the kiosk.

### Recognition + style generation
- Service: [backend/src/services/openaiArt.js](backend/src/services/openaiArt.js)
- Routes: [backend/src/routes/openaiArtRoutes.js](backend/src/routes/openaiArtRoutes.js)
  - `POST /api/recognize` — returns `{ label: "中文/English" }`.
  - `POST /api/generate-styles` — returns `{ label, options: [{id, zh, en, imageData, …}], failed, model }`.
  - `GET  /api/ai/styles` — returns the four hand-drawn presets (`pencil-wash`, `crayon`, `ink-sketch`, `marker-zine`).
- Uses the OpenAI **Responses API** with `image_generation` tool. Default model env: `OPENAI_RECOGNITION_MODEL`, `OPENAI_GENERATION_MODEL` (defaults: `gpt-5.5`).
- The frontend posts the canvas as a `data:image/png;base64,…` URL after compositing the off-white paper background (`exportCanvasWithPaper`).
- Generation runs all 4 presets in parallel with `Promise.allSettled`. Partial failures show in `options`/`failed`.

### Voice coach TTS
- Service: [backend/relay.js](backend/relay.js) `POST /api/tts`.
- Backend calls **StepFun** `stepaudio-2.5-tts` and streams the mp3 back.
- Required env: `STEP_API_KEY` (plus optional `STEP_API_BASE_URL`, `STEP_TTS_MODEL`, `STEP_TTS_VOICE`, `STEP_TTS_INSTRUCTION`).
- Client utility: [frontend-terminal/src/utils/speech.js](frontend-terminal/src/utils/speech.js).
  - Per-side audio panning via WebAudio `StereoPanner`: `pan: -1` (left ear) / `pan: 1` (right ear).
  - Per-side cancellation via `channelId` (`voice-coach-left`, `voice-coach-right`).
  - If `/api/tts` fails, falls back to `window.speechSynthesis` automatically.

### Legacy AI service (`ai-service/`)
Heuristic OpenCV shape recognition. Not used by the current frontend, but still referenced by `backend/src/config.js` (`AI_SERVICE_URL`) and by `docker-compose.yml`. Treat as deprecated unless asked to revive it.

---

## 8. Internationalization

- UI/coach copy is **inlined** per component, not in i18next resource files (despite `i18next` being in `package.json`). Search for the const `HOME_COPY`, `COACH_COPY`, `UI_COPY` etc.
- Eight languages currently have full copy: `zh, en, ja, ko, es, fr, de, ar`.
- Twenty languages exist in `backend/src/index.js` (`/api/languages`) but most are not exercised by the UI.
- **RTL**: only `ar`. Use the `RTL_LANGS` set pattern from `HomeScreen.jsx` or `VoiceCoach.jsx`.
- TTS language codes are mapped in `TTS_LANG` in `VoiceCoach.jsx`.

When adding a language:
1. Add an entry to every `*_COPY` object in `HomeScreen.jsx`, `SplitLanguageScreen.jsx` (`languages` array), `LanguageGameScreen.jsx` (only if you add UI strings), and `VoiceCoach.jsx` (`UI_COPY` + each `COACH_COPY` step).
2. Add the BCP-47 code to `TTS_LANG` in `VoiceCoach.jsx`.
3. If RTL, add it to every `RTL_LANGS` set (currently three duplicated sets — yes, they're duplicated on purpose, keep them in sync).

---

## 9. Language Game word library

[frontend-terminal/src/components/LanguageGameScreen.jsx](frontend-terminal/src/components/LanguageGameScreen.jsx) has a hardcoded `GAME_WORDS` array of seven Chinese characters with stroke coordinates in a 300×300 space. Each stroke is interpolated with `createStroke(pts)`.

To add a word:
1. Sketch the strokes in 300×300 coordinates (top-left origin), in correct stroke order.
2. Wrap each stroke in `createStroke([{x, y}, …])`.
3. Provide `en`, `zh`, `pinyin`, `emoji`.

The tracing tolerance is checked per-point against `scaledStrokes`: a stroke commits if `checkProgressRef >= 85%` of the path was followed within 45 px. The start-dot tolerance is 55 px.

---

## 10. Running the project (Windows + PowerShell)

The working directory contains a space, so quote paths.

```powershell
# Terminal 1 — backend relay (the one the frontend actually talks to)
cd "D:\Spring semester of sophomore year\studio3\layover\co-drawing-connections\backend"
node relay.js                                                  # uses backend/.env

# Terminal 2 — frontend
cd "D:\Spring semester of sophomore year\studio3\layover\co-drawing-connections\frontend-terminal"
npm run dev                                                    # http://localhost:5173

# (Optional) Terminal 3 — legacy heuristic AI service, only if you need its endpoints
cd "D:\Spring semester of sophomore year\studio3\layover\co-drawing-connections\ai-service"
python app.py                                                  # http://localhost:8000
```

Vite's dev proxy forwards `/api → http://localhost:3001`. The frontend also reads `VITE_API_URL` from `frontend-terminal/.env.local` if present.

Required env (`backend/.env`):
- `OPENAI_API_KEY` — without this, `/api/recognize` and `/api/generate-styles` return 500.
- `STEP_API_KEY` — without this, `/api/tts` returns 500 and the coach silently falls back to browser TTS.
- Optional overrides: `OPENAI_API_BASE_URL`, `OPENAI_RECOGNITION_MODEL`, `OPENAI_GENERATION_MODEL`, `OPENAI_IMAGE_QUALITY`, `OPENAI_IMAGE_SIZE`, `STEP_TTS_VOICE`, etc.

---

## 11. Conventions & gotchas

- **Canvas coordinates** are integer pixels in the canvas's own buffer (`canvas.width`/`canvas.height`), not CSS pixels. `getPos` normalizes touch and mouse input.
- **`exportCanvasWithPaper`** composites the canvas onto an off-white (`#F0EBE0`) background before sending to OpenAI; transparent backgrounds confuse the recognition prompt.
- **Generation prompts** rely on a "preserve hand-drawn imperfections" constraint. Do not change the prompt without verifying outputs across all 4 presets.
- **Recognition label format** is strictly `"中文/English"`; `normalizeLabel` enforces it. Anything else falls back to `"涂鸦/doodle"`.
- **`VoiceCoach`** uses `localStorage` key `layover.voiceCoach.seen.v1` to remember "got it". Bump the suffix if you change the coach copy meaningfully.
- **Mirrored undo**: `allStrokes.current` keeps the canonical list, with `remote: true` set on strokes received from the other terminal. Local undo skips remote strokes; remote undo events specify a `strokeId`.
- **Stroke ID format**: `${userId}-${Date.now()}` — unique per user per millisecond. Collisions are theoretically possible if a single user fires two strokes in the same ms; in practice never seen.
- **Logs**: `backend/relay.{out,err}.log`, `frontend-terminal/vite-*.log` are dev artifacts, not committed by `.gitignore` (it excludes `*.log`).
- **No automated tests** beyond `frontend-terminal/src/utils/shapeDetection.test.mjs` (`npm run test:shape`). Verify changes by running the app and drawing.

---

## 12. Where to look first

| If you're touching… | Start in… |
|---|---|
| Anything visible on screen | `frontend-terminal/src/App.jsx` → the matching `appState` screen |
| Real-time sync, multi-terminal | `backend/relay.js` + `frontend-terminal/src/hooks/useWebSocket.jsx` |
| OpenAI recognition or style images | `backend/src/services/openaiArt.js` + `backend/src/routes/openaiArtRoutes.js` |
| Voice / TTS | `backend/relay.js` `/api/tts` + `frontend-terminal/src/utils/speech.js` + `VoiceCoach.jsx` |
| Shape snap-to-geometry | `frontend-terminal/src/utils/shapeDetection.js` |
| Language-game word data | `GAME_WORDS` in `LanguageGameScreen.jsx` |
| i18n copy for the home/coach screens | the `*_COPY` constants inside the relevant component |
| User pairing / SQLite | `backend/src/index.js` + `backend/src/services/matching.js` + `backend/src/websocket/manager.js` (legacy / not currently exercised) |

When in doubt, grep for the user-visible string and trace upward.

---

## 13. What this project is *not*

- Not multi-device-paired across the internet. The "matching" code in `src/index.js` is aspirational; the live build uses one kiosk with two faces.
- Not authenticated. There are no user accounts; `userId` is a per-tab uuid.
- Not persistent. Strokes are not saved to disk in the current `relay.js` build. SQLite persistence exists only in the `src/index.js` path.
- Not production-hardened. CORS is `*`, rate-limiting only exists on the legacy server, and there is no auth on `/api/tts` or `/api/generate-styles`. Do not expose to the public internet without adding controls.
