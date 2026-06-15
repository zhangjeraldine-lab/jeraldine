const API_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return '';

  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl.replace(/\/$/, '');
  }
})();

const VOICE_QUALITY_HINTS = [
  ['natural', 34],
  ['neural', 32],
  ['online', 24],
  ['premium', 18],
  ['enhanced', 18],
  ['google', 12],
  ['microsoft', 6],
  ['apple', 6],
];

const LOW_QUALITY_HINTS = [
  ['desktop', -34],
  ['compact', -26],
  ['legacy', -24],
  ['espeak', -40],
  ['festival', -40],
  ['flite', -40],
];

const LANGUAGE_PROFILES = {
  zh: {
    speed: 0.95,
    pitch: 1.06,
    preferredNames: [
      ['xiaoxiao', 46],
      ['xiaoyi', 38],
      ['xiaobei', 36],
      ['xiaohan', 34],
      ['google mandarin', 34],
      ['google chinese', 34],
      ['mandarin', 16],
    ],
  },
  en: {
    speed: 0.98,
    pitch: 1.03,
    preferredNames: [
      ['jenny', 42],
      ['aria', 38],
      ['samantha', 34],
      ['ava', 30],
      ['google us english', 30],
      ['google uk english', 24],
    ],
  },
};

const DEFAULT_PROFILE = {
  speed: 1,
  pitch: 1.03,
  preferredNames: [],
};

const DEFAULT_CHANNEL = 'default';
let speechRunId = 0;
const speechChannels = new Map();
let audioContext = null;

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const canUseRemoteSpeech = () =>
  typeof window !== 'undefined' &&
  'Audio' in window &&
  'fetch' in window &&
  'URL' in window;

const canUseBrowserSpeech = () =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window;

export const canUseSpeech = () => canUseRemoteSpeech() || canUseBrowserSpeech();

export const getSpeechVoices = () => {
  if (!canUseBrowserSpeech()) return [];
  return window.speechSynthesis.getVoices();
};

export const loadSpeechVoices = () => {
  if (!canUseBrowserSpeech()) return Promise.resolve([]);

  const voices = getSpeechVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(getSpeechVoices());
    };

    synth.addEventListener?.('voiceschanged', finish);
    window.setTimeout(finish, 250);
  });
};

const normalizeLang = (lang = '') => lang.toLowerCase().replace(/_/g, '-');

const getLangRoot = (lang) => {
  const normalized = normalizeLang(lang);
  if (normalized.startsWith('cmn')) return 'zh';
  return normalized.split('-')[0] || '';
};

const getProfile = (lang) => LANGUAGE_PROFILES[getLangRoot(lang)] || DEFAULT_PROFILE;

const getVoiceText = (voice) =>
  `${voice.name || ''} ${voice.voiceURI || ''} ${voice.lang || ''}`.toLowerCase();

const getLanguageScore = (voice, requestedLang) => {
  const requested = normalizeLang(requestedLang);
  const voiceLang = normalizeLang(voice.lang);
  const requestedRoot = getLangRoot(requested);
  const voiceRoot = getLangRoot(voiceLang);

  if (!requested) return voice.default ? 8 : 1;
  if (voiceLang === requested) return 90;
  if (requested === 'zh-cn' && voiceLang === 'zh-hans-cn') return 86;
  if (requestedRoot === 'zh' && (voiceRoot === 'zh' || voiceLang.startsWith('cmn'))) return 68;
  if (voiceRoot && voiceRoot === requestedRoot) return 58;

  return 0;
};

const scoreTerms = (text, weightedTerms) =>
  weightedTerms.reduce((score, [term, weight]) => (
    text.includes(term) ? score + weight : score
  ), 0);

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  if (!audioContext) audioContext = new AudioContextConstructor();
  return audioContext;
};

const getSpeechChannel = (channelId = DEFAULT_CHANNEL) => {
  if (!speechChannels.has(channelId)) {
    speechChannels.set(channelId, {
      runId: 0,
      audio: null,
      objectUrl: null,
      controller: null,
      audioGraph: null,
      fallbackCancel: () => {},
    });
  }

  return speechChannels.get(channelId);
};

const disconnectAudioGraph = (audioGraph) => {
  if (!audioGraph) return;

  audioGraph.nodes.forEach((node) => {
    try {
      node.disconnect();
    } catch {
      // The node may already be disconnected by the browser.
    }
  });
};

const connectStereoOutput = (audio, pan = 0) => {
  const context = getAudioContext();
  if (!context) return null;

  try {
    const safePan = clampNumber(pan, 0, -1, 1);
    const source = context.createMediaElementSource(audio);
    const nodes = [source];

    if (typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner();
      panner.pan.value = safePan;
      source.connect(panner);
      panner.connect(context.destination);
      nodes.push(panner);
      return { context, nodes };
    }

    const leftGain = context.createGain();
    const rightGain = context.createGain();
    const merger = context.createChannelMerger(2);
    const normalizedPan = (safePan + 1) / 2;
    leftGain.gain.value = Math.cos(normalizedPan * Math.PI / 2);
    rightGain.gain.value = Math.sin(normalizedPan * Math.PI / 2);

    source.connect(leftGain);
    source.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(context.destination);
    nodes.push(leftGain, rightGain, merger);

    return { context, nodes };
  } catch {
    return null;
  }
};

export const selectNaturalVoice = (voices, lang) => {
  const availableVoices = voices?.length ? voices : getSpeechVoices();
  if (!availableVoices.length) return null;

  const profile = getProfile(lang);
  const ranked = availableVoices
    .map((voice, index) => {
      const languageScore = getLanguageScore(voice, lang);
      const text = getVoiceText(voice);
      const qualityScore = languageScore
        ? scoreTerms(text, profile.preferredNames) +
          scoreTerms(text, VOICE_QUALITY_HINTS) +
          scoreTerms(text, LOW_QUALITY_HINTS) +
          (voice.localService === false ? 8 : 0) +
          (voice.default ? 4 : 0)
        : (voice.default ? 2 : 0);

      return { voice, index, score: languageScore + qualityScore };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked[0]?.voice || availableVoices.find((voice) => voice.default) || availableVoices[0];
};

export const createNaturalUtterance = (text, lang, options = {}) => {
  const profile = getProfile(lang);
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = lang;
  utterance.rate = options.rate ?? profile.speed;
  utterance.pitch = options.pitch ?? profile.pitch;
  utterance.volume = options.volume ?? 1;
  utterance.voice = selectNaturalVoice(options.voices, lang);

  return utterance;
};

const speakWithBrowserFallback = (text, lang, options = {}) => {
  if (!canUseBrowserSpeech()) {
    options.onDone?.();
    return () => {};
  }

  let cancelled = false;
  const synth = window.speechSynthesis;
  const speak = (voices) => {
    if (cancelled) return;
    const utterance = createNaturalUtterance(text, lang, {
      ...options,
      voices,
      rate: options.rate ?? options.speed,
    });

    const handleDone = () => {
      if (!cancelled) options.onDone?.();
    };

    utterance.onend = handleDone;
    utterance.onerror = handleDone;
    synth.speak(utterance);
  };

  const voices = getSpeechVoices();
  if (voices.length) {
    speak(voices);
  } else {
    loadSpeechVoices().then(speak);
  }

  return () => {
    cancelled = true;
    synth.cancel();
  };
};

const cleanupRemoteAudio = (channelId = DEFAULT_CHANNEL) => {
  const channel = getSpeechChannel(channelId);
  disconnectAudioGraph(channel.audioGraph);
  channel.audioGraph = null;

  if (channel.audio) {
    channel.audio.pause();
    channel.audio.removeAttribute('src');
    channel.audio.load?.();
    channel.audio = null;
  }

  if (channel.objectUrl) {
    URL.revokeObjectURL(channel.objectUrl);
    channel.objectUrl = null;
  }
};

export const stopSpeech = (channelId) => {
  if (channelId === undefined) {
    speechRunId += 1;
    Array.from(speechChannels.keys()).forEach((key) => stopSpeech(key));
    if (canUseBrowserSpeech()) window.speechSynthesis.cancel();
    return;
  }

  const channel = getSpeechChannel(channelId);
  channel.runId += 1;
  speechRunId += 1;

  if (channel.controller) {
    channel.controller.abort();
    channel.controller = null;
  }

  channel.fallbackCancel();
  channel.fallbackCancel = () => {};
  cleanupRemoteAudio(channelId);
};

export const speakNaturally = (text, lang, options = {}) => {
  if (!text) {
    options.onDone?.();
    return () => {};
  }

  const channelId = options.channelId || options.channel || DEFAULT_CHANNEL;
  const channel = getSpeechChannel(channelId);
  if (options.cancel !== false) stopSpeech(channelId);

  const runId = channel.runId + 1;
  channel.runId = runId;
  speechRunId += 1;
  const profile = getProfile(lang);
  let cancelled = false;

  const finish = () => {
    if (!cancelled && getSpeechChannel(channelId).runId === runId) options.onDone?.();
  };

  if (!canUseRemoteSpeech()) {
    channel.fallbackCancel = speakWithBrowserFallback(text, lang, { ...options, onDone: finish });
    return () => {
      cancelled = true;
      channel.fallbackCancel();
    };
  }

  const controller = new AbortController();
  channel.controller = controller;

  const playRemoteSpeech = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          lang,
          speed: clampNumber(options.speed ?? options.rate, profile.speed, 0.5, 2),
          volume: clampNumber(options.volume, 1, 0.1, 2),
          instruction: options.instruction,
        }),
      });

      if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);

      const blob = await response.blob();
      if (cancelled || getSpeechChannel(channelId).runId !== runId) return;

      cleanupRemoteAudio(channelId);
      const currentChannel = getSpeechChannel(channelId);
      currentChannel.objectUrl = URL.createObjectURL(blob);
      currentChannel.audio = new Audio(currentChannel.objectUrl);
      currentChannel.audioGraph = connectStereoOutput(currentChannel.audio, options.pan);
      currentChannel.audio.onended = () => {
        cleanupRemoteAudio(channelId);
        finish();
      };
      currentChannel.audio.onerror = () => {
        cleanupRemoteAudio(channelId);
        currentChannel.fallbackCancel = speakWithBrowserFallback(text, lang, { ...options, onDone: finish });
      };

      if (currentChannel.audioGraph?.context?.state === 'suspended') {
        await currentChannel.audioGraph.context.resume();
      }

      await currentChannel.audio.play();
    } catch {
      if (cancelled || controller.signal.aborted || getSpeechChannel(channelId).runId !== runId) return;
      channel.fallbackCancel = speakWithBrowserFallback(text, lang, { ...options, onDone: finish });
    } finally {
      if (getSpeechChannel(channelId).controller === controller) {
        getSpeechChannel(channelId).controller = null;
      }
    }
  };

  playRemoteSpeech();

  return () => {
    cancelled = true;
    if (getSpeechChannel(channelId).runId === runId) getSpeechChannel(channelId).runId += 1;
    speechRunId += 1;
    controller.abort();
    channel.fallbackCancel();
    cleanupRemoteAudio(channelId);
  };
};
