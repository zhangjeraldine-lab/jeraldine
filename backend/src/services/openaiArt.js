import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const STEP_API_BASE = (process.env.STEP_API_BASE_URL || 'https://api.stepfun.com/v1').replace(/\/$/, '');
const STEP_VISION_MODEL = process.env.STEP_VISION_MODEL || 'step-1o-turbo-vision';
const STEP_IMAGE_EDIT_MODEL = process.env.STEP_IMAGE_EDIT_MODEL || 'step-image-edit-2';
const STEP_IMAGE_EDIT_FALLBACK_MODEL = process.env.STEP_IMAGE_EDIT_FALLBACK_MODEL || '';
const STEP_IMAGE_STEPS = Number(process.env.STEP_IMAGE_STEPS || 8);
const STEP_IMAGE_CFG_SCALE = Number(process.env.STEP_IMAGE_CFG_SCALE || 1.0);
const STEP_REQUEST_TIMEOUT_MS = Number(process.env.STEP_REQUEST_TIMEOUT_MS || 120000);
const CODEX_CLI_COMMAND = process.env.CODEX_CLI_COMMAND || (process.platform === 'win32' ? process.execPath : 'codex');
const CODEX_CLI_JS_PATH = process.env.CODEX_CLI_JS_PATH
  || (process.platform === 'win32' && process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
    : '');
const CODEX_CLI_MODEL = process.env.CODEX_CLI_MODEL || 'gpt-5.5';
const CODEX_CLI_TIMEOUT_MS = Number(process.env.CODEX_CLI_TIMEOUT_MS || 120000);

const MAX_IMAGE_BYTES = 18 * 1024 * 1024;
const FALLBACK_LABEL = '涂鸦/doodle';

const CATEGORY_ZH = {
  object: '常见物体',
  animal: '动物',
  person: '人物',
  building: '建筑',
  vehicle: '交通工具',
  scene: '场景',
  symbol: '符号',
  emotion: '情绪',
  abstract: '抽象',
  mixed: '组合场景',
  unknown: '未知',
};

const DISPLAY_LANGUAGE_NAMES = {
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
};

const normalizeLangCode = (lang) => String(lang || '').split('-')[0].toLowerCase();

const normalizeDisplayLanguages = (languages = []) => {
  const normalized = Array.isArray(languages)
    ? languages.map(normalizeLangCode)
    : [normalizeLangCode(languages)];
  return [...new Set(['zh', 'en', ...normalized])]
    .filter((lang) => DISPLAY_LANGUAGE_NAMES[lang])
    .slice(0, 8);
};

export class OpenAIArtError extends Error {
  constructor(message, statusCode = 500, detail = undefined) {
    super(message);
    this.name = 'OpenAIArtError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

export const HAND_DRAWN_STYLE_PRESETS = [
  {
    id: 'pencil-wash',
    zh: '铅笔淡彩',
    en: 'Pencil wash',
    prompt: 'soft pencil lines, light watercolor wash, visible paper grain',
  },
  {
    id: 'crayon',
    zh: '蜡笔童趣',
    en: 'Crayon',
    prompt: 'wax crayon texture, playful childlike color fills',
  },
  {
    id: 'ink-sketch',
    zh: '墨线速写',
    en: 'Ink sketch',
    prompt: 'loose black ink sketch with a few muted color accents',
  },
  {
    id: 'marker-zine',
    zh: '马克手账',
    en: 'Marker zine',
    prompt: 'handmade marker illustration, layered strokes, travel-journal feel',
  },
];

const ensureStepApiKey = () => {
  if (!process.env.STEP_API_KEY) {
    throw new OpenAIArtError('missing STEP_API_KEY', 500);
  }
};

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const titleCase = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

const truncate = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

const parseJSON = (text) => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const extractJSON = (text) => {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
};

export const validateImageData = (imageData) => {
  if (typeof imageData !== 'string') {
    throw new OpenAIArtError('imageData must be a data URL string', 400);
  }

  const prefixMatch = imageData.match(/^data:image\/(png|jpe?g|webp);base64,/i);
  if (!prefixMatch) {
    throw new OpenAIArtError('imageData must be a PNG, JPEG, or WEBP data URL', 400);
  }

  const base64 = imageData.slice(prefixMatch[0].length);
  const estimatedBytes = Buffer.byteLength(base64, 'base64');
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    throw new OpenAIArtError('imageData is too large', 413);
  }

  return imageData;
};

const decodeImageData = (imageData) => {
  validateImageData(imageData);
  const match = imageData.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/i);
  const mime = match[1].toLowerCase();
  const ext = match[2].toLowerCase().replace('jpeg', 'jpg');
  return {
    mime,
    ext,
    buffer: Buffer.from(match[3], 'base64'),
  };
};

const stepRequest = async (path, { method = 'POST', headers = {}, body }) => {
  ensureStepApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STEP_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${STEP_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.STEP_API_KEY}`,
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseJSON(text);

    if (!response.ok) {
      const message = data?.error?.message || data?.message || text || `StepFun request failed (${response.status})`;
      const statusCode = response.status >= 500 ? 502 : response.status;
      throw new OpenAIArtError(message, statusCode, data);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new OpenAIArtError('StepFun request timed out', 504);
    }
    if (error instanceof OpenAIArtError) throw error;
    throw new OpenAIArtError(error.message || 'StepFun request failed', 502);
  } finally {
    clearTimeout(timeout);
  }
};

const stepChat = async (messages, options = {}) => stepRequest('/chat/completions', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: options.model || STEP_VISION_MODEL,
    messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxTokens || 700,
  }),
});

const extractChatText = (payload) => {
  const message = payload?.choices?.[0]?.message;
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => part?.text || part?.content || '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
};

const normalizeLabel = (text) => {
  const cleaned = String(text || '')
    .replace(/["'“”‘’]/g, '')
    .split(/\r?\n/)[0]
    .trim();

  const match = cleaned.match(/([^/]{1,18})\s*\/\s*([A-Za-z][A-Za-z -]{0,34})/);
  if (!match) return FALLBACK_LABEL;

  const zh = match[1].trim().replace(/[，。,.!?！？;；:：]+$/g, '');
  const en = match[2].trim().replace(/[，。,.!?！？;；:：]+$/g, '').toLowerCase();
  if (!zh || !en) return FALLBACK_LABEL;
  return `${zh}/${en}`;
};

const splitLabel = (label) => {
  const normalized = normalizeLabel(label);
  const [zh, en] = normalized.split('/');
  return { zh, en };
};

const normalizeMiniResult = (value) => {
  const zh = truncate(value?.labelZh || value?.zh || '未确定', 12);
  const en = truncate(value?.labelEn || value?.en || 'unknown', 28).toLowerCase();
  return {
    labelZh: zh,
    labelEn: en,
    label: normalizeLabel(`${zh}/${en}`),
    confidence: clamp(value?.confidence, 0, 1, 0.35),
  };
};

const normalizeLocalizedRecognition = (raw, base) => {
  const localized = {};
  const source = raw?.localized && typeof raw.localized === 'object' ? raw.localized : {};

  for (const lang of Object.keys(DISPLAY_LANGUAGE_NAMES)) {
    const item = source[lang] && typeof source[lang] === 'object' ? source[lang] : {};
    localized[lang] = {
      label: truncate(
        item.label || (lang === 'zh' ? base.labelZh : lang === 'en' ? base.labelEn : ''),
        36,
      ),
      category: truncate(
        item.category || (lang === 'zh' ? base.categoryZh : ''),
        36,
      ),
      relationship: truncate(
        item.relationship || (lang === 'zh' ? base.collaboration.relationshipZh : lang === 'en' ? base.collaboration.relationshipEn : ''),
        90,
      ),
      scene: truncate(
        item.scene || (lang === 'zh' ? base.collaboration.sceneZh : lang === 'en' ? base.collaboration.sceneEn : ''),
        48,
      ),
      completionSuggestion: truncate(
        item.completionSuggestion || (lang === 'zh' ? base.completion.suggestionZh : lang === 'en' ? base.completion.suggestionEn : ''),
        100,
      ),
      glossaryDefinition: truncate(
        item.glossaryDefinition || (lang === 'zh' ? base.glossary.definitionZh : lang === 'en' ? base.glossary.definitionEn : ''),
        140,
      ),
      suggestions: Array.isArray(item.suggestions)
        ? item.suggestions.slice(0, 4).map((suggestion) => truncate(suggestion, 80))
        : [],
    };
  }

  return localized;
};

const normalizeRecognition = (raw = {}) => {
  if (typeof raw === 'string') {
    const { zh, en } = splitLabel(raw);
    raw = { labelZh: zh, labelEn: en };
  }

  const labelZh = truncate(raw.labelZh || raw.zh || raw.label || '涂鸦', 12);
  const labelEn = truncate(raw.labelEn || raw.en || 'doodle', 28).toLowerCase();
  const label = normalizeLabel(`${labelZh}/${labelEn}`);
  const category = String(raw.semanticCategory || raw.category || 'unknown').toLowerCase();
  const semanticCategory = CATEGORY_ZH[category] ? category : 'unknown';
  const suggestionsZh = Array.isArray(raw.suggestionsZh) ? raw.suggestionsZh : [];
  const suggestionsEn = Array.isArray(raw.suggestionsEn) ? raw.suggestionsEn : [];

  const base = {
    label,
    labelZh: label.split('/')[0],
    labelEn: label.split('/')[1],
    confidence: clamp(raw.confidence, 0, 1, semanticCategory === 'unknown' ? 0.28 : 0.62),
    semanticCategory,
    categoryZh: raw.categoryZh || CATEGORY_ZH[semanticCategory],
    leftUser: normalizeMiniResult(raw.leftUser),
    rightUser: normalizeMiniResult(raw.rightUser),
    collaboration: {
      relationshipZh: truncate(raw.collaboration?.relationshipZh || '共同构成一个画面', 36),
      relationshipEn: truncate(raw.collaboration?.relationshipEn || 'shared composition', 60),
      sceneZh: truncate(raw.collaboration?.sceneZh || raw.sceneZh || label.split('/')[0], 24),
      sceneEn: truncate(raw.collaboration?.sceneEn || raw.sceneEn || label.split('/')[1], 40),
    },
    completion: {
      canComplete: Boolean(raw.completion?.canComplete),
      suggestionZh: truncate(raw.completion?.suggestionZh || '可以补全轮廓和少量细节', 60),
      suggestionEn: truncate(raw.completion?.suggestionEn || 'complete the outline and a few details', 90),
      missingPartsZh: Array.isArray(raw.completion?.missingPartsZh) ? raw.completion.missingPartsZh.slice(0, 5) : [],
      missingPartsEn: Array.isArray(raw.completion?.missingPartsEn) ? raw.completion.missingPartsEn.slice(0, 5) : [],
    },
    glossary: {
      term: truncate(raw.glossary?.term || titleCase(label.split('/')[1]), 32),
      pronunciation: truncate(raw.glossary?.pronunciation || '', 32),
      definitionZh: truncate(raw.glossary?.definitionZh || `${label.split('/')[0]}相关的英文词汇。`, 80),
      definitionEn: truncate(raw.glossary?.definitionEn || 'A drawing-related word.', 120),
    },
    suggestionsZh: suggestionsZh.length ? suggestionsZh.slice(0, 4) : [
      '试试添加背景。',
      '可以让两幅画连接起来。',
      '你们想一起创造一个故事吗？',
    ],
    suggestionsEn: suggestionsEn.length ? suggestionsEn.slice(0, 4) : [
      'Try adding a background.',
      'Connect the two drawings together.',
      'Make a small story from the scene.',
    ],
    provider: 'stepfun',
    model: STEP_VISION_MODEL,
  };

  base.localized = normalizeLocalizedRecognition(raw, base);
  return base;
};

const buildRecognitionPrompt = (strokeContext, displayLanguages = []) => {
  const languages = normalizeDisplayLanguages(displayLanguages);
  const localizedShape = languages
    .map((lang) => `"${lang}":{"label":"${lang === 'zh' ? '苹果' : 'apple'}","category":"${DISPLAY_LANGUAGE_NAMES[lang]} category","relationship":"${DISPLAY_LANGUAGE_NAMES[lang]} relationship sentence","scene":"${DISPLAY_LANGUAGE_NAMES[lang]} scene name","completionSuggestion":"${DISPLAY_LANGUAGE_NAMES[lang]} completion suggestion","glossaryDefinition":"${DISPLAY_LANGUAGE_NAMES[lang]} vocabulary definition","suggestions":["${DISPLAY_LANGUAGE_NAMES[lang]} creative suggestion"]}`)
    .join(',');

  return `
你是 AI Co-Creation Engine 的草图识别模块。请分析这张两位用户共同绘制的简笔画，识别物体、动物、人物、建筑、交通工具、抽象符号、情绪和多元素组合场景。
${strokeContext ? `笔触摘要：${truncate(JSON.stringify(strokeContext), 900)}` : ''}
界面语言需要本地化为：${languages.map((lang) => `${lang}=${DISPLAY_LANGUAGE_NAMES[lang]}`).join(', ')}。
只输出合法 JSON，不要 Markdown：
{
  "labelZh":"苹果",
  "labelEn":"apple",
  "confidence":0.86,
  "semanticCategory":"object",
  "categoryZh":"常见物体",
  "leftUser":{"labelZh":"苹果","labelEn":"apple","confidence":0.8},
  "rightUser":{"labelZh":"树","labelEn":"tree","confidence":0.7},
  "collaboration":{"relationshipZh":"苹果和树组成果园场景","relationshipEn":"apple and tree form an orchard scene","sceneZh":"果园","sceneEn":"orchard"},
  "completion":{"canComplete":true,"suggestionZh":"补全苹果轮廓、叶子和果梗","suggestionEn":"complete the apple outline, leaf and stem","missingPartsZh":["叶子"],"missingPartsEn":["leaf"]},
  "glossary":{"term":"Apple","pronunciation":"/ˈæpəl/","definitionZh":"一种圆形水果，外皮通常是红色或绿色。","definitionEn":"A round fruit with red or green skin."},
  "suggestionsZh":["试试添加背景。","可以让两幅画连接起来。"],
  "suggestionsEn":["Try adding a background.","Connect the two drawings together."],
  "localized":{${localizedShape}}
}
置信度请保守；无法判断时 labelZh 用“涂鸦”，labelEn 用“doodle”，semanticCategory 用 "unknown"。
`.trim();
};

export const recognizeSketch = async (imageData, strokeContext = null, displayLanguages = []) => {
  const safeImageData = validateImageData(imageData);
  const response = await stepChat([
    {
      role: 'system',
      content: '你是面向机场双人共创绘画装置的视觉理解引擎，只返回机器可解析的 JSON。',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildRecognitionPrompt(strokeContext, displayLanguages) },
        { type: 'image_url', image_url: { url: safeImageData } },
      ],
    },
  ]);

  return normalizeRecognition(extractJSON(extractChatText(response)));
};

const prompt512 = (prompt) => truncate(prompt, 512);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientStepError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return /overload|temporar|timeout|busy|rate limit|try again/.test(message);
};

const fetchUrlAsDataUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new OpenAIArtError(`could not fetch generated image (${response.status})`, 502);
  const contentType = response.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

const extractStepImage = async (payload, model) => {
  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return {
      imageData: `data:image/png;base64,${item.b64_json}`,
      finishReason: item.finish_reason || null,
      seed: item.seed ?? null,
      model,
    };
  }
  if (item?.url) {
    return {
      imageData: await fetchUrlAsDataUrl(item.url),
      finishReason: item.finish_reason || null,
      seed: item.seed ?? null,
      model,
    };
  }
  throw new OpenAIArtError('StepFun response did not include an image', 502, payload);
};

const getImageEditModels = () =>
  [...new Set([STEP_IMAGE_EDIT_MODEL, STEP_IMAGE_EDIT_FALLBACK_MODEL].filter(Boolean))];

const getCodexCliInvocation = () => {
  if (process.platform === 'win32' && CODEX_CLI_COMMAND === process.execPath && CODEX_CLI_JS_PATH) {
    return {
      command: process.execPath,
      prefixArgs: [CODEX_CLI_JS_PATH],
    };
  }
  return {
    command: CODEX_CLI_COMMAND,
    prefixArgs: [],
  };
};

const runChildProcess = (command, args, { cwd, timeout, input = '' }) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    child.kill('SIGTERM');
    const error = new Error(`Command timed out after ${timeout}ms`);
    error.stdout = stdout;
    error.stderr = stderr;
    error.code = 'ETIMEDOUT';
    reject(error);
  }, timeout);

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    if (stdout.length > 16 * 1024 * 1024) stdout = stdout.slice(-8 * 1024 * 1024);
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 16 * 1024 * 1024) stderr = stderr.slice(-8 * 1024 * 1024);
  });

  child.stdin.end(input);

  child.on('error', (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    error.stdout = stdout;
    error.stderr = stderr;
    reject(error);
  });

  child.on('close', (code) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (code === 0) {
      resolve({ stdout, stderr });
    } else {
      const error = new Error(`Command failed with exit code ${code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = code;
      reject(error);
    }
  });
});

const runCodexCliWithImage = async (imageData, prompt, { timeout = CODEX_CLI_TIMEOUT_MS } = {}) => {
  const decoded = decodeImageData(imageData);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'layover-codex-'));
  const imagePath = path.join(tempDir, `sketch.${decoded.ext}`);
  const outputPath = path.join(tempDir, 'response.txt');

  try {
    await writeFile(imagePath, decoded.buffer);
    const args = [
      'exec',
      '-m',
      CODEX_CLI_MODEL,
      '-c',
      'model_reasoning_effort="low"',
      '--ignore-user-config',
      '--ignore-rules',
      '--skip-git-repo-check',
      '--ephemeral',
      '--sandbox',
      'read-only',
      '-C',
      tempDir,
      '-i',
      imagePath,
      '-o',
      outputPath,
      '-',
    ];

    const invocation = getCodexCliInvocation();
    await runChildProcess(invocation.command, [...invocation.prefixArgs, ...args], {
      cwd: tempDir,
      timeout,
      input: prompt,
    });

    return await readFile(outputPath, 'utf8');
  } catch (error) {
    throw new OpenAIArtError(`Codex CLI failed: ${error.message || 'unknown error'}`, 502, {
      command: getCodexCliInvocation().command,
      stderr: truncate(error.stderr || '', 1200),
      stdout: truncate(error.stdout || '', 1200),
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

const stripSvgNoise = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return '';
  return match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .trim();
};

const svgDataUrl = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

const stepImageEdit = async (imageData, prompt, { seed, textMode = false, retries = 0 } = {}) => {
  const decoded = decodeImageData(imageData);
  let lastError = null;

  for (const model of getImageEditModels()) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const form = new FormData();
      const blob = new Blob([decoded.buffer], { type: decoded.mime });
      const attemptSeed = Number.isFinite(seed)
        ? (seed + attempt * 7919) % 2147483647
        : undefined;

      form.append('model', model);
      form.append('image', blob, `sketch.${decoded.ext}`);
      form.append('prompt', prompt512(prompt));
      form.append('response_format', 'b64_json');
      form.append('cfg_scale', String(clamp(STEP_IMAGE_CFG_SCALE, 1, 10, 1)));
      form.append('steps', String(Math.round(clamp(STEP_IMAGE_STEPS, 1, 50, 8))));
      if (Number.isFinite(attemptSeed)) form.append('seed', String(attemptSeed));
      if (model === 'step-image-edit-2' && textMode) form.append('text_mode', 'true');

      try {
        const response = await stepRequest('/images/edits', { body: form });
        return extractStepImage(response, model);
      } catch (error) {
        lastError = error;
        const canRetryThisModel = attempt < retries && isTransientStepError(error);
        if (canRetryThisModel) {
          await wait(900 + attempt * 1400);
          continue;
        }
        if (!isTransientStepError(error)) throw error;
        break;
      }
    }
  }

  throw lastError || new OpenAIArtError('image edit failed', 502);
};

const SIMPLE_ENHANCE_MODES = {
  polish: {
    idPrefix: 'ai-enhance',
    zh: 'AI 增强',
    en: 'AI enhance',
    prompt: `
Edit the uploaded collaborative doodle.
Keep the user's original subject, composition, scale, and naive hand-drawn charm.
Preserve imperfect wobbly lines, childlike simplicity, and the feeling that a person drew it by hand.
Only make it slightly clearer and more delightful: gentle cleanup, subtle line confidence, light paper texture, no big redesign.
Do not make it photorealistic, do not create polished vector art, and do not add text, logos, frames, signatures, or captions.
`.trim(),
  },
  color: {
    idPrefix: 'ai-color',
    zh: '填色',
    en: 'Color fill',
    prompt: `
Edit the uploaded collaborative doodle by adding simple playful color fills.
Keep the exact hand-drawn linework, naive proportions, subject, and composition.
Use soft crayon or light watercolor-like colors that still feel childlike and handmade.
Leave the drawing recognizable as the user's sketch; do not repaint it as realistic or professional digital art.
Do not add text, logos, frames, signatures, or captions.
`.trim(),
  },
};

const getSimpleEnhanceMode = (mode) =>
  SIMPLE_ENHANCE_MODES[String(mode || '').toLowerCase()] || SIMPLE_ENHANCE_MODES.polish;

export const enhanceSimpleSketch = async (imageData, mode = 'polish') => {
  const safeImageData = validateImageData(imageData);
  const preset = getSimpleEnhanceMode(mode);
  const colorMode = preset.idPrefix === 'ai-color';
  const responseText = await runCodexCliWithImage(safeImageData, `
You are generating a simple hand-drawn SVG from a collaborative doodle image.
Look at the attached sketch, infer the most likely subject or mood, and create a new SVG that keeps the naive, wobbly, childlike feeling.
${colorMode
  ? 'Add gentle crayon-like color fills while keeping simple blue/ink outlines.'
  : 'Lightly clarify the sketch with simple rounded outlines and a few tiny handmade details.'}
Rules:
- Return only valid JSON, no markdown, no explanation.
- JSON shape: {"titleZh":"...","titleEn":"...","svg":"<svg ...>...</svg>"}
- The SVG must be self-contained, viewBox "0 0 1024 768", width "1024", height "768".
- Use simple paths/circles/ellipses with round caps and round joins; make lines slightly imperfect.
- Include a pale paper background (#f7fbfa).
- Do not include readable text, logos, scripts, external links, markdown, or HTML outside the svg.
`.trim(), { timeout: Number(process.env.CODEX_CLI_IMAGE_TIMEOUT_MS || CODEX_CLI_TIMEOUT_MS) });

  const parsed = extractJSON(responseText);
  const svg = stripSvgNoise(parsed.svg || responseText);
  if (!svg) {
    throw new OpenAIArtError('Codex CLI did not return an SVG image', 502, { responseText });
  }
  const titleZh = truncate(parsed.titleZh || preset.zh, 28);
  const titleEn = truncate(parsed.titleEn || preset.en, 48);

  return {
    mode: colorMode ? 'color' : 'polish',
    option: {
      id: `${preset.idPrefix}-${Date.now()}`,
      zh: titleZh,
      en: titleEn,
      title: `${titleZh} / ${titleEn}`,
      prompt: 'codex-cli-svg',
      model: 'codex-cli',
      provider: 'codex-cli',
      imageData: svgDataUrl(svg),
      finishReason: null,
      seed: null,
    },
  };
};

const buildLocalSketchStory = (languages = []) => {
  const localized = {};
  for (const lang of languages) {
    localized[lang] = {
      title: lang === 'zh' ? '画里的小故事' : 'Tiny story',
      story: lang === 'zh'
        ? '这幅小画像刚睡醒的冒险队，线条歪歪扭扭却很认真。它们决定今天不追求完美，只负责把白纸变得更有趣。'
        : 'This little drawing looks like an adventure team that just woke up. The lines are wonderfully wobbly, and their only mission today is to make the page more fun.',
    };
  }
  return localized;
};

export const tellSimpleSketchStory = async (imageData, displayLanguages = []) => {
  const safeImageData = validateImageData(imageData);
  const languages = normalizeDisplayLanguages(displayLanguages);
  const localizedShape = languages
    .map((lang) => `"${lang}":{"title":"short title in ${DISPLAY_LANGUAGE_NAMES[lang]}","story":"1-3 short playful sentences in ${DISPLAY_LANGUAGE_NAMES[lang]}"}`)
    .join(',');
  const responseText = await runCodexCliWithImage(safeImageData, `
Look at the attached childlike collaborative doodle and write a tiny playful story about what might be happening in the picture.
Do not critique the drawing. Do not mention AI. Keep it warm, funny, and simple.
Return only valid JSON in this exact shape:
{"storyZh":"...","storyEn":"...","localized":{${localizedShape}}}
`.trim(), { timeout: Number(process.env.CODEX_CLI_STORY_TIMEOUT_MS || CODEX_CLI_TIMEOUT_MS) });

  const parsed = extractJSON(responseText);
  const local = buildLocalSketchStory(languages);
  const localized = {};
  for (const lang of languages) {
    const item = parsed.localized?.[lang] || {};
    localized[lang] = {
      title: truncate(item.title || local[lang]?.title || 'Tiny story', 40),
      story: truncate(item.story || local[lang]?.story || '', 420),
    };
  }

  return {
    storyZh: truncate(parsed.storyZh || localized.zh?.story || local.zh?.story || '', 420),
    storyEn: truncate(parsed.storyEn || localized.en?.story || local.en?.story || '', 420),
    localized,
    provider: 'codex-cli',
    model: 'codex-cli',
  };
};

const getRecognitionLabel = (recognition) => {
  if (typeof recognition === 'string') return normalizeLabel(recognition);
  if (recognition?.label) return normalizeLabel(recognition.label);
  return FALLBACK_LABEL;
};

const buildGenerationPrompt = (style, label) => `
保留这张双人协作简笔画的主体、构图和原始手绘痕迹。识别主题：${label}。
只做辅助美化：线条更平滑，轮廓更清晰，比例稍微修正，补充少量合理细节，统一为 ${style.prompt}。
不要替代创作，不要改变主题，不要添加文字、logo、边框或写实照片质感。
`.trim();

const generateStyleOption = async (imageData, style, label, index) => {
  const generated = await stepImageEdit(imageData, buildGenerationPrompt(style, label), {
    seed: (Date.now() + index * 9973) % 2147483647,
  });

  return {
    id: style.id,
    zh: style.zh,
    en: style.en,
    title: `${style.zh} / ${style.en}`,
    label,
    prompt: buildGenerationPrompt(style, label),
    model: STEP_IMAGE_EDIT_MODEL,
    ...generated,
  };
};

export const generateHandDrawnVariants = async (imageData, requestedStyleIds = [], recognition = null, displayLanguages = []) => {
  const safeImageData = validateImageData(imageData);
  const requested = Array.isArray(requestedStyleIds) ? requestedStyleIds.slice(0, 4) : [];
  const styles = requested.length
    ? HAND_DRAWN_STYLE_PRESETS.filter((style) => requested.includes(style.id))
    : HAND_DRAWN_STYLE_PRESETS;

  if (!styles.length) {
    throw new OpenAIArtError('no valid styles requested', 400);
  }

  let recognized = recognition ? normalizeRecognition(recognition) : null;
  let recognitionError = null;
  if (!recognized) {
    try {
      recognized = await recognizeSketch(safeImageData, null, displayLanguages);
    } catch (error) {
      recognitionError = error.message;
      recognized = normalizeRecognition(FALLBACK_LABEL);
    }
  }

  const label = getRecognitionLabel(recognized);
  const results = await Promise.allSettled(
    styles.map((style, index) => generateStyleOption(safeImageData, style, label, index)),
  );

  const options = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  const failed = results
    .map((result, index) => ({ result, style: styles[index] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ result, style }) => ({
      id: style.id,
      error: result.reason?.message || 'generation failed',
    }));

  if (!options.length) {
    throw new OpenAIArtError('all image edits failed', 502, {
      recognitionError,
      failed,
    });
  }

  return {
    label,
    recognition: recognized,
    options,
    failed,
    recognitionError,
    provider: 'stepfun',
    model: STEP_IMAGE_EDIT_MODEL,
  };
};

export const completeSemanticDrawing = async (imageData, recognition = null) => {
  const safeImageData = validateImageData(imageData);
  const detail = normalizeRecognition(recognition || FALLBACK_LABEL);
  const label = getRecognitionLabel(detail);
  const missingZh = detail.completion?.missingPartsZh?.join('、') || '轮廓和必要细节';
  const prompt = `
保留原始手绘线条、构图和两位用户的创意。识别主题：${label}。
请只补全缺失部分：${missingZh}；让对象更完整，但仍像用户亲手画的简笔画。
不要大幅重画，不要添加文字、logo、边框或照片质感。
`.trim();

  const generated = await stepImageEdit(safeImageData, prompt);
  return {
    label,
    option: {
      id: `semantic-${Date.now()}`,
      zh: '语义补全',
      en: 'Completion',
      title: '语义补全 / Completion',
      label,
      prompt,
      model: STEP_IMAGE_EDIT_MODEL,
      ...generated,
    },
  };
};

export const editDrawingByCommand = async (imageData, command, recognition = null) => {
  const safeImageData = validateImageData(imageData);
  const cleanCommand = truncate(command, 120);
  if (!cleanCommand) throw new OpenAIArtError('empty edit command', 400);

  const detail = normalizeRecognition(recognition || FALLBACK_LABEL);
  const label = getRecognitionLabel(detail);
  const prompt = `
根据用户自然语言指令修改这张手绘作品：“${cleanCommand}”。
当前识别主题：${label}。保留原始创意、构图和手绘感，只做用户要求的颜色、形态、风格、场景或情绪调整。
不要添加文字、logo、边框，不要变成写实照片。
`.trim();

  const generated = await stepImageEdit(safeImageData, prompt);
  return {
    label,
    command: cleanCommand,
    option: {
      id: `voice-${Date.now()}`,
      zh: cleanCommand.slice(0, 8),
      en: 'Voice edit',
      title: `${cleanCommand} / Voice edit`,
      label,
      prompt,
      model: STEP_IMAGE_EDIT_MODEL,
      ...generated,
    },
  };
};

export const buildLocalCreativeSuggestion = (recognition = null) => {
  const detail = normalizeRecognition(recognition || FALLBACK_LABEL);
  const localized = {};
  for (const lang of Object.keys(DISPLAY_LANGUAGE_NAMES)) {
    localized[lang] = {
      suggestions: detail.localized?.[lang]?.suggestions?.length
        ? detail.localized[lang].suggestions
        : lang === 'zh'
          ? detail.suggestionsZh
          : lang === 'en'
            ? detail.suggestionsEn
            : [],
      theme: detail.localized?.[lang]?.scene || '',
    };
  }

  return {
    suggestionsZh: detail.suggestionsZh?.length ? detail.suggestionsZh : [
      '试试添加背景。',
      '可以让两幅画连接起来。',
      '你们想一起创造一个故事吗？',
    ],
    suggestionsEn: detail.suggestionsEn?.length ? detail.suggestionsEn : [
      'Try adding a background.',
      'Connect the two drawings together.',
      'Make a small story from the scene.',
    ],
    themeZh: detail.collaboration?.sceneZh || detail.labelZh,
    themeEn: detail.collaboration?.sceneEn || detail.labelEn,
    localized,
    provider: 'local',
  };
};

export const suggestCreativeNextStep = async (imageData, recognition = null, displayLanguages = []) => {
  const safeImageData = validateImageData(imageData);
  const detail = normalizeRecognition(recognition || FALLBACK_LABEL);
  const languages = normalizeDisplayLanguages(displayLanguages);
  const localizedShape = languages
    .map((lang) => `"${lang}":{"theme":"${DISPLAY_LANGUAGE_NAMES[lang]} theme","suggestions":["${DISPLAY_LANGUAGE_NAMES[lang]} suggestion 1","${DISPLAY_LANGUAGE_NAMES[lang]} suggestion 2","${DISPLAY_LANGUAGE_NAMES[lang]} suggestion 3"]}`)
    .join(',');
  const response = await stepChat([
    {
      role: 'system',
      content: '你是温和的双人绘画共创引导员，只输出 JSON。',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `
用户停顿了。请基于画面和当前识别结果，给出 3 条短创意建议，避免让用户觉得“不会画”。
当前识别：${JSON.stringify(detail)}
需要本地化的界面语言：${languages.map((lang) => `${lang}=${DISPLAY_LANGUAGE_NAMES[lang]}`).join(', ')}
只输出 JSON：{"suggestionsZh":["..."],"suggestionsEn":["..."],"themeZh":"...","themeEn":"...","localized":{${localizedShape}}}
`.trim(),
        },
        { type: 'image_url', image_url: { url: safeImageData } },
      ],
    },
  ], { maxTokens: 260, temperature: 0.35 });

  const parsed = extractJSON(extractChatText(response));
  const local = buildLocalCreativeSuggestion(detail);
  const localized = {};
  for (const lang of languages) {
    const item = parsed.localized?.[lang] || {};
    localized[lang] = {
      theme: truncate(item.theme || local.localized?.[lang]?.theme || '', 40),
      suggestions: Array.isArray(item.suggestions) && item.suggestions.length
        ? item.suggestions.slice(0, 3).map((suggestion) => truncate(suggestion, 80))
        : (local.localized?.[lang]?.suggestions || []).slice(0, 3),
    };
  }

  return {
    suggestionsZh: Array.isArray(parsed.suggestionsZh) && parsed.suggestionsZh.length
      ? parsed.suggestionsZh.slice(0, 3)
      : local.suggestionsZh.slice(0, 3),
    suggestionsEn: Array.isArray(parsed.suggestionsEn) && parsed.suggestionsEn.length
      ? parsed.suggestionsEn.slice(0, 3)
      : local.suggestionsEn.slice(0, 3),
    themeZh: truncate(parsed.themeZh || local.themeZh, 24),
    themeEn: truncate(parsed.themeEn || local.themeEn, 40),
    localized,
    provider: 'stepfun',
    model: STEP_VISION_MODEL,
  };
};
