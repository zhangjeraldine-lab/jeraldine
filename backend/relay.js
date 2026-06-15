import http from 'http';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Server } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import 'dotenv/config';
import registerDrawingShareRoutes from './src/routes/drawingShareRoutes.js';
import registerOpenAIArtRoutes from './src/routes/openaiArtRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app    = express();
const server = http.createServer(app);

app.use(express.json({ limit: '50mb' }));

const STEP_API_BASE = process.env.STEP_API_BASE_URL || 'https://api.stepfun.com/v1';
const STEP_TTS_ENDPOINT = `${STEP_API_BASE}/audio/speech`;
const STEP_TTS_MODEL = process.env.STEP_TTS_MODEL || 'stepaudio-2.5-tts';
const STEP_TTS_VOICE = process.env.STEP_TTS_VOICE || 'livelybreezy-female';
const STEP_TTS_INSTRUCTION =
  process.env.STEP_TTS_INSTRUCTION ||
  '自然、亲切、清晰，像在耐心引导两位旅客一起完成互动。';

const STEP_REALTIME_MODEL = process.env.STEP_REALTIME_MODEL || 'stepaudio-2.5-realtime';
const STEP_REALTIME_VOICE = process.env.STEP_REALTIME_VOICE || STEP_TTS_VOICE || 'linjiajiejie';
const STEP_REALTIME_URL = (() => {
  const wsBase = STEP_API_BASE.replace(/^http/i, 'ws');
  return `${wsBase}/realtime?model=${encodeURIComponent(STEP_REALTIME_MODEL)}`;
})();

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

registerOpenAIArtRoutes(app);
const drawingShare = registerDrawingShareRoutes(app, {
  port: PORT,
  mobileAppDir: path.join(__dirname, '../mobile-app'),
  storageDir: path.join(__dirname, '../data/drawings'),
});

app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || req.body?.input || '').trim();
  if (!text) return res.status(400).json({ error: 'no text' });
  if (text.length > 1000) return res.status(400).json({ error: 'text too long' });
  if (!process.env.STEP_API_KEY) return res.status(500).json({ error: 'missing STEP_API_KEY' });

  const model = req.body?.model || STEP_TTS_MODEL;
  const payload = {
    model,
    input: text,
    voice: req.body?.voice || STEP_TTS_VOICE,
    response_format: req.body?.response_format || 'mp3',
    speed: clampNumber(req.body?.speed ?? req.body?.rate, 1, 0.5, 2),
    volume: clampNumber(req.body?.volume, 1, 0.1, 2),
    sample_rate: clampNumber(req.body?.sample_rate, 48000, 8000, 48000),
    markdown_filter: true,
  };

  if (model === 'stepaudio-2.5-tts') {
    payload.instruction = String(req.body?.instruction || STEP_TTS_INSTRUCTION).slice(0, 200);
  }

  try {
    const response = await fetch(STEP_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.STEP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error('StepFun TTS error:', response.status, message);
      return res.status(response.status).json({ error: 'tts failed', detail: message });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType.includes('audio') ? contentType : 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audioBuffer);
  } catch (err) {
    console.error('StepFun TTS request error:', err.message);
    return res.status(502).json({ error: 'tts request failed', detail: err.message });
  }
});

const frontendDistDir = path.join(__dirname, '../frontend-terminal/dist');
if (existsSync(path.join(frontendDistDir, 'index.html'))) {
  app.use(express.static(frontendDistDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
} else {
  console.warn(`Frontend dist not found: ${frontendDistDir}. Run npm run build in frontend-terminal first.`);
}

// ── Socket.IO relay ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 25 * 1024 * 1024,
});

io.on('connection', (socket) => {
  console.log('+ connected:', socket.id);

  socket.on('joinRoom', (roomId, cb) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`  ${socket.id} joined room: ${roomId}`);
    if (cb) cb({ ok: true });
  });

  socket.on('canvasStroke', ({ roomId, userId, stroke }) => {
    socket.to(roomId).emit('remoteStroke', { stroke, userId });
  });

  socket.on('strokePoint', ({ roomId, userId, strokeId, meta, points }) => {
    socket.to(roomId).emit('remoteStrokePoint', { userId, strokeId, meta, points });
  });

  // Pass ALL fields through (filter, strokeId, label, etc.)
  socket.on('canvasAction', (payload) => {
    const { roomId, ...rest } = payload;
    socket.to(roomId).emit('remoteAction', rest);
  });

  socket.on('disconnect', () => {
    console.log('- disconnected:', socket.id);
  });
});

// ── Realtime interpreter bridge (StepFun stepaudio-2.5-realtime) ──────────────
// Browser ⇄ this relay (raw WS, path /ws/interpret) ⇄ StepFun realtime WS.
// Push-to-talk: browser streams base64 PCM16 chunks, then sends 'commit' to
// trigger a translation. We feed the StepFun model an "interpreter" system
// prompt so it speaks ONLY the translation in the target language.

const LANG_NAMES = {
  zh: 'Chinese (Mandarin)',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  ru: 'Russian',
  pt: 'Portuguese',
  it: 'Italian',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
};

const langLabel = (code) => LANG_NAMES[String(code || '').toLowerCase()] || code || 'English';

const buildInterpreterInstruction = (fromCode, toCode) => {
  const from = langLabel(fromCode);
  const to = langLabel(toCode);
  return [
    `You are a real-time simultaneous interpreter at an airport lounge.`,
    `The user speaks in ${from}. Translate everything they say into ${to}.`,
    `Speak the translation aloud in ${to} only. Do NOT add commentary, do NOT explain, do NOT answer questions, do NOT repeat the source language.`,
    `Preserve names, numbers, dates, and tone faithfully. If the input is unclear, translate as faithfully as you can without inventing content.`,
  ].join(' ');
};

const wssInterpret = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  let url;
  try { url = new URL(request.url, `http://${request.headers.host}`); }
  catch { return; }

  if (url.pathname === '/ws/interpret') {
    wssInterpret.handleUpgrade(request, socket, head, (ws) => {
      wssInterpret.emit('connection', ws, request, url);
    });
  }
  // Socket.IO attaches its own upgrade listener for /socket.io/* — leave it alone.
});

wssInterpret.on('connection', (client, request, url) => {
  if (!process.env.STEP_API_KEY) {
    client.send(JSON.stringify({ type: 'error', message: 'missing STEP_API_KEY on server' }));
    client.close(1011, 'missing api key');
    return;
  }

  const fromLang = (url.searchParams.get('from') || 'zh').toLowerCase();
  const toLang = (url.searchParams.get('to') || 'en').toLowerCase();
  const voice = url.searchParams.get('voice') || STEP_REALTIME_VOICE;

  console.log(`+ interpret: ${fromLang} → ${toLang} (voice=${voice})`);

  const upstream = new WebSocket(STEP_REALTIME_URL, {
    headers: { Authorization: `Bearer ${process.env.STEP_API_KEY}` },
  });

  let upstreamReady = false;
  const clientQueue = [];

  const safeSendClient = (obj) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(obj));
  };

  const safeSendUpstream = (obj) => {
    if (!upstream || upstream.readyState !== WebSocket.OPEN) return;
    upstream.send(JSON.stringify(obj));
  };

  upstream.on('open', () => {
    upstreamReady = true;
    upstream.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: buildInterpreterInstruction(fromLang, toLang),
        voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: null,
      },
    }));
    safeSendClient({ type: 'ready', from: fromLang, to: toLang, voice });
    while (clientQueue.length) upstream.send(clientQueue.shift());
  });

  upstream.on('message', (raw) => {
    let evt;
    try { evt = JSON.parse(raw.toString()); }
    catch { return; }

    switch (evt.type) {
      case 'response.audio.delta':
        safeSendClient({ type: 'audio.delta', audio: evt.delta });
        break;
      case 'response.audio.done':
        safeSendClient({ type: 'audio.done' });
        break;
      case 'response.audio_transcript.delta':
        safeSendClient({ type: 'translation.delta', text: evt.delta });
        break;
      case 'response.audio_transcript.done':
        safeSendClient({ type: 'translation.done', text: evt.transcript || evt.text || '' });
        break;
      case 'conversation.item.input_audio_transcription.completed':
        safeSendClient({ type: 'source.done', text: evt.transcript || '' });
        break;
      case 'response.done':
        safeSendClient({ type: 'response.done' });
        break;
      case 'error':
        console.error('  upstream error:', evt.error);
        safeSendClient({ type: 'error', message: evt.error?.message || 'upstream error' });
        break;
      default:
        // ignore: session.updated, response.created, rate_limits.*, …
        break;
    }
  });

  upstream.on('close', (code, reason) => {
    console.log(`- interpret upstream closed: ${code} ${reason?.toString() || ''}`);
    if (client.readyState === WebSocket.OPEN) client.close(1000, 'upstream closed');
  });

  upstream.on('error', (err) => {
    console.error('  upstream ws error:', err.message);
    safeSendClient({ type: 'error', message: `upstream: ${err.message}` });
  });

  client.on('message', (raw) => {
    let evt;
    try { evt = JSON.parse(raw.toString()); }
    catch { return; }

    const forward = (payload) => {
      const buf = JSON.stringify(payload);
      if (upstreamReady) upstream.send(buf);
      else clientQueue.push(buf);
    };

    switch (evt.type) {
      case 'audio.chunk':
        if (typeof evt.audio === 'string' && evt.audio.length) {
          forward({ type: 'input_audio_buffer.append', audio: evt.audio });
        }
        break;
      case 'commit':
        forward({ type: 'input_audio_buffer.commit' });
        forward({ type: 'response.create' });
        break;
      case 'cancel':
        forward({ type: 'response.cancel' });
        forward({ type: 'input_audio_buffer.clear' });
        break;
      default:
        break;
    }
  });

  client.on('close', () => {
    console.log(`- interpret client closed`);
    if (upstream.readyState === WebSocket.OPEN) upstream.close();
  });

  client.on('error', (err) => {
    console.error('  interpret client error:', err.message);
    try { upstream.close(); } catch {}
  });
});

server.listen(PORT, () => {
  console.log(`Relay + AI server → http://localhost:${PORT}`);
  console.log(`Interpreter bridge → ws://localhost:${PORT}/ws/interpret`);
  console.log(`Drawing share base   → ${drawingShare.shareBase}/m/<id>`);
  console.log(`Drawing storage      → ${drawingShare.storageDir}`);
  if (existsSync(path.join(frontendDistDir, 'index.html'))) {
    console.log(`Layover website      → ${drawingShare.shareBase}/`);
  }
});
