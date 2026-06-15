// StepFun realtime interpreter client.
//   - Opens a raw WebSocket to /ws/interpret on the relay (which proxies to
//     wss://api.stepfun.com/v1/realtime).
//   - Captures the mic, resamples to 24 kHz mono PCM16, sends base64 chunks.
//   - Decodes PCM16 audio deltas coming back and plays them through a
//     WebAudio graph with optional stereo panning (so the listener-side ear
//     hears the translation).

const SAMPLE_RATE = 24000;
const CHUNK_FRAMES = 2400; // 100 ms at 24 kHz

const API_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return '';
  try { return new URL(apiUrl).origin; }
  catch { return apiUrl.replace(/\/$/, ''); }
})();

const buildWsUrl = ({ from, to, voice }) => {
  const origin = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const u = new URL('/ws/interpret', origin);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  if (from) u.searchParams.set('from', from);
  if (to)   u.searchParams.set('to', to);
  if (voice) u.searchParams.set('voice', voice);
  return u.toString();
};

const clampPan = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(-1, n));
};

// Float32 [-1,1] → Int16LE little-endian Uint8Array.
const float32ToPcm16LE = (float32) => {
  const out = new Uint8Array(float32.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < float32.length; i++) {
    let s = float32[i];
    if (s > 1) s = 1; else if (s < -1) s = -1;
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
};

// Browser-safe Uint8Array → base64 (handles large buffers in chunks).
const bytesToBase64 = (bytes) => {
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

const base64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const pcm16BytesToFloat32 = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = bytes.byteLength / 2;
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return out;
};

// Linear downsampler. Input sampleRate → 24 kHz. Good enough for speech
// streamed at one-shot translation latencies.
const resampleTo24k = (input, inputRate) => {
  if (inputRate === SAMPLE_RATE) return input;
  const ratio = inputRate / SAMPLE_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcF = i * ratio;
    const i0 = Math.floor(srcF);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = srcF - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
};

// Streams 24 kHz PCM16 chunks into AudioContext, gapless.
class PcmStreamPlayer {
  constructor({ pan = 0, sampleRate = SAMPLE_RATE, onEmpty } = {}) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctor({ sampleRate });
    this.sampleRate = this.ctx.sampleRate;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1;

    if (typeof this.ctx.createStereoPanner === 'function') {
      this.panner = this.ctx.createStereoPanner();
      this.panner.pan.value = clampPan(pan);
      this.gain.connect(this.panner).connect(this.ctx.destination);
    } else {
      this.gain.connect(this.ctx.destination);
    }

    this.cursor = 0;
    this.active = 0;
    this.onEmpty = onEmpty;
  }

  async resume() {
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }
  }

  enqueueFloat32(float32) {
    if (!float32 || !float32.length) return;
    const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate);
    buffer.getChannelData(0).set(float32);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);

    const now = this.ctx.currentTime;
    const startAt = Math.max(this.cursor, now + 0.02);
    src.start(startAt);
    this.cursor = startAt + buffer.duration;

    this.active += 1;
    src.onended = () => {
      this.active = Math.max(0, this.active - 1);
      if (this.active === 0) this.onEmpty?.();
    };
  }

  enqueuePcm16Base64(b64) {
    if (!b64) return;
    const bytes = base64ToBytes(b64);
    const f32 = pcm16BytesToFloat32(bytes);
    this.enqueueFloat32(f32);
  }

  stop() {
    try { this.gain.disconnect(); } catch {}
    try { this.panner?.disconnect(); } catch {}
    try { this.ctx.close(); } catch {}
    this.cursor = 0;
    this.active = 0;
  }
}

// AudioWorklet code, registered inline via a Blob URL so we don't need a
// separate static file shipped by Vite.
const WORKLET_SRC = `
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length) {
      // copy: the underlying buffer is recycled by the host
      this.port.postMessage(ch.slice(0));
    }
    return true;
  }
}
registerProcessor('interpreter-capture', CaptureProcessor);
`;

let workletUrl = null;
const getWorkletUrl = () => {
  if (workletUrl) return workletUrl;
  const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' });
  workletUrl = URL.createObjectURL(blob);
  return workletUrl;
};

export class InterpreterSession {
  constructor({ from, to, voice, pan = 0, onSource, onTranslation, onStatus, onError } = {}) {
    this.from = from;
    this.to = to;
    this.voice = voice;
    this.pan = clampPan(pan);
    this.onSource = onSource;
    this.onTranslation = onTranslation;
    this.onStatus = onStatus;
    this.onError = onError;

    this.ws = null;
    this.ready = false;
    this.capturing = false;

    this.captureCtx = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.captureSource = null;
    this.captureRate = 48000;
    this.leftover = new Float32Array(0);

    this.player = null;

    this.translationBuf = '';
    this.sourceBuf = '';
  }

  async open() {
    this.onStatus?.('connecting');
    this.ws = new WebSocket(buildWsUrl({ from: this.from, to: this.to, voice: this.voice }));

    await new Promise((resolve, reject) => {
      const onOpen = () => { this.ws.removeEventListener('error', onErr); resolve(); };
      const onErr = (e) => { this.ws.removeEventListener('open', onOpen); reject(e); };
      this.ws.addEventListener('open', onOpen, { once: true });
      this.ws.addEventListener('error', onErr, { once: true });
    });

    this.ws.addEventListener('message', (ev) => this._handleMessage(ev));
    this.ws.addEventListener('close', () => {
      this.onStatus?.('closed');
    });
  }

  _handleMessage(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); }
    catch { return; }

    switch (msg.type) {
      case 'ready':
        this.ready = true;
        this.onStatus?.('ready');
        break;
      case 'audio.delta':
        if (!this.player) {
          this.player = new PcmStreamPlayer({
            pan: this.pan,
            onEmpty: () => this.onStatus?.('idle'),
          });
        }
        this.player.resume();
        this.player.enqueuePcm16Base64(msg.audio);
        this.onStatus?.('playing');
        break;
      case 'audio.done':
        // playback continues until queue drains
        break;
      case 'translation.delta':
        this.translationBuf += msg.text || '';
        this.onTranslation?.(this.translationBuf, false);
        break;
      case 'translation.done':
        if (msg.text) this.translationBuf = msg.text;
        this.onTranslation?.(this.translationBuf, true);
        break;
      case 'source.done':
        this.sourceBuf = msg.text || '';
        this.onSource?.(this.sourceBuf, true);
        break;
      case 'response.done':
        // nothing extra; audio drain triggers idle
        break;
      case 'error':
        this.onError?.(msg.message || 'unknown error');
        break;
      default:
        break;
    }
  }

  async startCapture() {
    if (this.capturing) return;
    this.translationBuf = '';
    this.sourceBuf = '';
    this.onSource?.('', false);
    this.onTranslation?.('', false);

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    const Ctor = window.AudioContext || window.webkitAudioContext;
    this.captureCtx = new Ctor();
    this.captureRate = this.captureCtx.sampleRate;
    await this.captureCtx.audioWorklet.addModule(getWorkletUrl());

    this.captureSource = this.captureCtx.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.captureCtx, 'interpreter-capture');
    this.leftover = new Float32Array(0);

    this.workletNode.port.onmessage = (ev) => this._onMicChunk(ev.data);
    this.captureSource.connect(this.workletNode);

    this.capturing = true;
    this.onStatus?.('listening');
  }

  _onMicChunk(float32) {
    if (!this.capturing || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Append to leftover, then resample chunks of CHUNK_FRAMES @ captureRate
    // worth of samples → ~100 ms slices at 24 kHz.
    const merged = new Float32Array(this.leftover.length + float32.length);
    merged.set(this.leftover, 0);
    merged.set(float32, this.leftover.length);

    const inFramesPerChunk = Math.round((CHUNK_FRAMES * this.captureRate) / SAMPLE_RATE);
    let offset = 0;
    while (merged.length - offset >= inFramesPerChunk) {
      const slice = merged.subarray(offset, offset + inFramesPerChunk);
      const downsampled = resampleTo24k(slice, this.captureRate);
      const pcm = float32ToPcm16LE(downsampled);
      this.ws.send(JSON.stringify({ type: 'audio.chunk', audio: bytesToBase64(pcm) }));
      offset += inFramesPerChunk;
    }
    this.leftover = merged.slice(offset);
  }

  async stopCapture() {
    if (!this.capturing) return;
    this.capturing = false;

    // Flush leftover (pad to chunk multiple isn't required — pcm16 handles short tails).
    if (this.leftover.length && this.ws?.readyState === WebSocket.OPEN) {
      const downsampled = resampleTo24k(this.leftover, this.captureRate);
      const pcm = float32ToPcm16LE(downsampled);
      this.ws.send(JSON.stringify({ type: 'audio.chunk', audio: bytesToBase64(pcm) }));
    }
    this.leftover = new Float32Array(0);

    try { this.workletNode?.disconnect(); } catch {}
    try { this.captureSource?.disconnect(); } catch {}
    try { this.mediaStream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { await this.captureCtx?.close(); } catch {}
    this.workletNode = null;
    this.captureSource = null;
    this.mediaStream = null;
    this.captureCtx = null;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'commit' }));
    }
    this.onStatus?.('translating');
  }

  cancel() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel' }));
    }
    this.player?.stop();
    this.player = null;
    this.onStatus?.('idle');
  }

  async close() {
    try { await this.stopCapture(); } catch {}
    this.player?.stop();
    this.player = null;
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.ready = false;
  }
}
