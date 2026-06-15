# AGENT.md — How AI agents should work on this codebase

This file is for any **AI coding agent** (Claude Code, Cursor, an SDK-driven agent, a sub-agent spawned by another agent) that picks up work on Co-Drawing Connections.

It complements [CLAUDE.md](CLAUDE.md). CLAUDE.md tells you *what the project is*. AGENT.md tells you *how to act inside it*.

---

## 1. Project posture in one paragraph

This is a **student studio project / art installation prototype**, not a hardened product. The bar is: it has to demo cleanly in front of strangers and feel emotionally warm. Reliability and ease of demo matter more than test coverage, future-proofing, or architectural purity. Don't add infrastructure the demo doesn't need; do invest in things that make the live experience feel good (smooth strokes, low-latency mirror, calm TTS pacing, legible bilingual copy).

---

## 2. Before you change anything

1. **Read [CLAUDE.md](CLAUDE.md) §4 first.** There are two backend entry points (`relay.js` vs `src/index.js`) and the live demo runs on `relay.js`. Half the bugs reported "I edited X and nothing changed" are caused by editing the wrong server.
2. **Identify which screen you're touching.** `App.jsx` switches on `appState`: `selecting → home → drawing | language-game`. The `VoiceCoach` overlay is rendered alongside all of them.
3. **Mirror logic awareness.** If you change anything about input coordinates, stroke serialization, or canvas size, verify both halves of the screen still mirror correctly. The same applies to undo/redo/clear — they must respect side ownership.
4. **Don't assume the matchmaking server is running.** The `enter / matched / strokeBatch` events from `backend/src/index.js` are not what the frontend listens for in the live build.

---

## 3. Decision rules

### When to spawn a sub-agent (and which one)

| Goal | Sub-agent | Notes |
|---|---|---|
| "Where is X defined / which files reference Y" | `Explore` | One targeted lookup. Single answer. |
| Broad sweep across many components / docs / styles | `general-purpose` | When you'd otherwise issue 4+ Grep/Read calls. |
| Designing a new screen / refactor plan | `Plan` | Returns a step-by-step plan; does not edit. |
| Looking for code-review feedback on an in-flight diff | `code-reviewer` (if available) | Independent read, no shared context with you. |
| Anything else (default) | `claude` | Catch-all. |

**Do not spawn sub-agents to do the obvious work.** If you already know the file, just `Read` it. Sub-agents have cold context and add overhead.

### When to use direct tools

- Known file path → `Read`.
- Known symbol → `Grep` (literal string) or `Glob` (filename).
- Multi-file mechanical rename → `Edit` with `replace_all`, file-by-file.
- Creating a new file → `Write`, but **only** if you couldn't extend an existing one. The repo already has files for almost every concern; resist creating `utils2.js`, `helpers.js`, `newScreen.jsx` unless the topic is genuinely new.

### When to ask the user instead of guessing

Ask before:
- Touching the matchmaking/SQLite path (`backend/src/index.js`, `services/matching.js`, `websocket/manager.js`). It is partially-implemented and the demo doesn't use it.
- Changing OpenAI model names or prompts in `services/openaiArt.js` — the recognition format `"中文/English"` is load-bearing for the UI.
- Adding a new dependency. The frontend bundle is currently small; ask before adding anything > 50 KB minified.
- Changing the kiosk orientation convention (180° rotated left half). Multiple components assume it.

---

## 4. Common workflows

### 4.1 Add a new language

1. `Grep` for an existing language code (e.g. `'ko'`) to find every copy block.
2. Add the new code with translated copy to **all** of these:
   - `HOME_COPY` in `frontend-terminal/src/components/HomeScreen.jsx`
   - `languages` array in `frontend-terminal/src/components/SplitLanguageScreen.jsx`
   - `UI_COPY` and `COACH_COPY` (per step: `home`, `selecting`, `drawing`, `language`) in `frontend-terminal/src/components/VoiceCoach.jsx`
   - `TTS_LANG` in `VoiceCoach.jsx` (BCP-47 code)
   - If RTL: every `RTL_LANGS = new Set([...])` — there are three duplicated sets.
3. Verify in the browser: pick the new language on the split screen and walk through every screen with the voice coach running.

### 4.2 Add a word to the Language Game

1. Open `frontend-terminal/src/components/LanguageGameScreen.jsx`.
2. Sketch the character's strokes on paper in a 300×300 grid, **in correct stroke order**.
3. Append to `GAME_WORDS`:
   ```js
   {
     en: 'big', zh: '大', pinyin: 'dà', emoji: '🙆',
     strokes: [
       createStroke([{x: …, y: …}, …]),
       …
     ],
   }
   ```
4. Run the app, hit Play Again until the new word appears, and trace it end-to-end to confirm.

### 4.3 Add a new AI style preset (hand-drawn variant)

1. Open `backend/src/services/openaiArt.js`.
2. Add an entry to `HAND_DRAWN_STYLE_PRESETS`:
   ```js
   {
     id: 'unique-id',
     zh: '中文名',
     en: 'English name',
     prompt: 'concrete visual cues — line texture, color treatment, paper feel',
   }
   ```
3. The frontend automatically picks it up via `/api/ai/styles`. No frontend change required unless you also want to surface a thumbnail or constrain which presets to render.
4. **Test with a real canvas.** Some prompts produce photoreal output that breaks the hand-drawn feel — adjust phrasing until the generated PNG visibly looks hand-drawn on an off-white background.

### 4.4 Tweak voice coach timing / panning

- Per-side speech is keyed by `channelId: 'voice-coach-left'` / `'voice-coach-right'` and panned `pan: -1` / `pan: 1`. See `playStep` in `VoiceCoach.jsx`.
- If both speakers talk at once and overlap unpleasantly, stagger them — but be careful: the coach is independent per side by design, because the two travelers may be on different stages of the flow if one walks away.

### 4.5 Diagnose "strokes don't sync"

1. Is the **relay** server up? `backend/relay.out.log` should have a recent `+ connected:` line.
2. In the browser console, is `useWebSocket` reporting `isConnected: true`?
3. `useWebSocket` is a **module-level singleton**. If a previous edit accidentally created multiple `io()` calls, double-listeners cause weird duplication. Grep for `io(` outside `useWebSocket.jsx`.
4. The room ID is hardcoded to `'layover-main'`. Two terminals using different IDs will never see each other.

---

## 5. Code style rules

- **No unsolicited refactors.** A two-line fix should be a two-line fix. Don't restyle the surrounding file.
- **Comments**: see CLAUDE: only when the *why* is non-obvious. Don't narrate what the code does.
- **No new abstractions** until there are three concrete callers. The codebase already trends toward inline copy/state for clarity; respect that.
- **Bilingual UI strings stay together** in the per-component `*_COPY` objects. Do not extract them to a generic i18n file "for cleanliness" — that would scatter context across screens.
- **Avoid emojis in code/comments** unless the user asked. UI strings already use emojis intentionally (`🎨`, `✈`, etc.); copy them, don't invent more.
- **No `.env`/secrets in commits.** `OPENAI_API_KEY`, `STEP_API_KEY`, etc. live only in `backend/.env`.

---

## 6. Verifying changes

There is almost no automated test suite. The verification path is **run the app**:

1. Boot the relay: `node backend/relay.js`.
2. Boot the frontend: `cd frontend-terminal && npm run dev`.
3. Open `http://localhost:5173` in **two browser windows** (or one wide window + DevTools) to simulate the two halves.
4. Walk: language pick → home → drawing → recognize → generate → home → language game → draw → trace → reveal.
5. Listen to the voice coach on both sides; verify the per-side language and per-ear panning.

The only unit test in the repo:
```powershell
cd frontend-terminal
npm run test:shape          # node --test src/utils/shapeDetection.test.mjs
```
Run it if you touch `shapeDetection.js`.

If a change is visual or experiential (drawing, TTS, animation), **you must run it before reporting done.** Type-checking the JS will not catch a bad UX.

---

## 7. Things that will bite an agent

- **Path with a space.** `D:\Spring semester of sophomore year\studio3\layover\...`. Always quote.
- **Two `.gitignore`d log files** (`relay.{out,err}.log`, `vite-*.log`) look like clutter but are useful when diagnosing live demo issues. Don't delete them blindly.
- **`canvas.filter` CSS** (the AI "ink/water/warm/cool/neon" presets) is applied to the whole canvas element via inline style. It does not bake into exported pixels. If you add a "save" feature you need to render through a 2D context with the filter applied, or use `ctx.filter`.
- **Mirrored strokes are drawn live as the user moves**, not just on stroke-end. If you batch the local draw to be more efficient, you'll desync the two halves visually.
- **The `i18next` and `react-i18next` packages are installed but unused.** Don't assume there's a translation file you can edit — there isn't.
- **`socket.io-client` v4 with relay** — check that any change to event names lines up between `relay.js`, `useWebSocket`, and the canvas component. Renaming `canvasStroke` is a three-file edit.
- **`docker-compose.yml` references `backend/src/index.js`**, not `relay.js`. If you change docker behavior, decide explicitly which server you want production to run.

---

## 8. Communicating with the user

- The user works in Chinese and English. Reply in whichever the user wrote in; mixed is fine.
- The user is a sophomore-year studio student. Default to **explaining the *why*** of design/architecture choices when proposing changes, not just the *what*.
- Keep status updates short. End-of-turn: one or two sentences on what changed and what's next.
- If a change touches the demo flow, say so explicitly: "this will affect what the kiosk does at the language-pick screen."

---

## 9. When you finish a task

1. Confirm the affected screens still load and the voice coach still speaks.
2. Mention any env vars that need to be set for your change to work (`OPENAI_API_KEY`, `STEP_API_KEY`, new ones).
3. Mention any state in `localStorage` that should be cleared (the coach uses `layover.voiceCoach.seen.v1`).
4. If you added a new dependency, note it and confirm `npm install` was run in the right folder.
5. Don't volunteer to "also clean up" unrelated code. End the task.

---

## 10. Hard "do not"s

- Do **not** push, force-push, reset, rebase, or otherwise alter remote git state without an explicit request.
- Do **not** commit `.env`, `data/app.db`, `node_modules/`, or anything in `dist/`.
- Do **not** call OpenAI or StepFun from frontend code directly. All paid API calls go through the backend.
- Do **not** turn the relay into a stateful server (sessions, auth, persistence) without first proposing the change. The relay's strength is that it's <120 lines and easy to reason about.
- Do **not** expose `/api/tts` or `/api/generate-styles` to the public internet from this build. There is no auth or rate limiting on them.
