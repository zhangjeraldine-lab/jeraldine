let activeSouvenir = null;
let currentLang = localStorage.getItem('layover-mobile-lang') || 'zh';
let souvenirStatus = 'default';
const SHARE_TITLE = '邀请你鉴赏 layover 全球画廊';
const SHARE_TEXT = '打开 layover 全球画廊，收藏这一刻的共创画作。';

const I18N = {
  zh: {
    code: 'zh-CN',
    langLabel: '语言',
    shareTitle: '邀请你鉴赏 layover 全球画廊',
    shareText: '打开 layover 全球画廊，收藏这一刻的共创画作。',
    souvenirTitle: '数字纪念品',
    souvenirSub: 'The Digital Souvenir',
    loadingTitle: '正在载入画作',
    loadingSub: 'Loading your co-drawing',
    soloReadyTitle: '你的独创画作',
    coReadyTitle: '你的共创画作',
    soloReadySub: 'Your solo drawing is ready',
    coReadySub: 'Your co-drawing is ready',
    expiredTitle: '画作已过期',
    expiredSub: 'Drawing link expired',
    locationLabel: '地点 · Location',
    dateLabel: '时间 · Date',
    withLabel: '合作者 · With',
    themeLabel: '主题 · Theme',
    localNetwork: '局域网 · Local network',
    terminal: '共绘连接终端',
    soloDrawing: '单人绘画 · Solo drawing',
    coTerminal: '共绘连接终端 · Co-drawing terminal',
    digitalSouvenir: 'Digital souvenir',
    storyLabel: '画里的故事 · Story',
    download: '下载 Download',
    share: '分享 Share',
    galleryTitle: '我的画廊',
    gallerySub: 'My Gallery · Past Creations',
    all: '全部 All',
    solo: '独创 Solo',
    co: '共创 Co',
    soloDetail: '独创',
    coDetail: '共创',
    remarkDivider: '留言 · Remark',
    contributionDivider: "他人在此创作 · Other's creation on it",
    noContributions: '暂无他人创作 · No contributions yet',
    noRemarks: '还没有留言 · No remarks yet',
    remarkPlaceholder: '写下你的留言 · Leave a remark...',
    send: '发送',
    traceTitle: '全球足迹',
    traceSub: 'Global Trace · Explore the world map',
    airports: '机场 Airports',
    partners: '合作者 Partners',
    languages: '语言 Languages',
    soloLegend: '独创 Solo',
    coLegend: '共创 Co-creation',
    navHandshake: '纪念',
    navGallery: '画廊',
    navTrace: '足迹',
    shareTo: '分享到 · Share to',
    wechat: '微信',
    moments: '朋友圈',
    copyLink: '复制链接',
    cancel: '取消 Cancel',
    scanFirst: '请先从终端扫码打开画作 · Scan from terminal first',
    downloading: '正在下载 · Downloading',
    linkCopied: '链接已复制 · Link copied',
    shared: '已分享 · Shared',
    justNow: '刚刚 · Just now',
    unavailable: 'Unavailable',
    loadPlaceholder: '正在从终端同步画作<br/>Loading artwork from the kiosk',
    errorPlaceholder: '没有找到这幅画，请回到终端重新生成二维码。<br/>Please generate a new QR code from the terminal.',
  },
  en: {
    code: 'en',
    langLabel: 'Language',
    shareTitle: 'View this layover global gallery piece',
    shareText: 'Open the layover global gallery and keep this co-created drawing.',
    souvenirTitle: 'Digital Souvenir',
    souvenirSub: 'Your shared drawing',
    loadingTitle: 'Loading artwork',
    loadingSub: 'Syncing from the terminal',
    soloReadyTitle: 'Your Solo Drawing',
    coReadyTitle: 'Your Co-Drawing',
    soloReadySub: 'Your solo drawing is ready',
    coReadySub: 'Your co-drawing is ready',
    expiredTitle: 'Drawing Link Expired',
    expiredSub: 'Please generate a new QR code',
    locationLabel: 'Location',
    dateLabel: 'Date',
    withLabel: 'With',
    themeLabel: 'Theme',
    localNetwork: 'Local network',
    terminal: 'Co-drawing terminal',
    soloDrawing: 'Solo drawing',
    coTerminal: 'Co-drawing terminal',
    digitalSouvenir: 'Digital souvenir',
    storyLabel: 'Story',
    download: 'Download',
    share: 'Share',
    galleryTitle: 'My Gallery',
    gallerySub: 'Past Creations',
    all: 'All',
    solo: 'Solo',
    co: 'Co',
    soloDetail: 'Solo Creation',
    coDetail: 'Co-creation',
    remarkDivider: 'Remark',
    contributionDivider: "Other's creation on it",
    noContributions: 'No contributions yet',
    noRemarks: 'No remarks yet',
    remarkPlaceholder: 'Leave a remark...',
    send: 'Send',
    traceTitle: 'Global Trace',
    traceSub: 'Explore the world map',
    airports: 'Airports',
    partners: 'Partners',
    languages: 'Languages',
    soloLegend: 'Solo',
    coLegend: 'Co-creation',
    navHandshake: 'Souvenir',
    navGallery: 'Gallery',
    navTrace: 'Trace',
    shareTo: 'Share to',
    wechat: 'WeChat',
    moments: 'Moments',
    copyLink: 'Copy link',
    cancel: 'Cancel',
    scanFirst: 'Scan from terminal first',
    downloading: 'Downloading',
    linkCopied: 'Link copied',
    shared: 'Shared',
    justNow: 'Just now',
    unavailable: 'Unavailable',
    loadPlaceholder: 'Loading artwork from the kiosk',
    errorPlaceholder: 'Drawing not found. Please generate a new QR code from the terminal.',
  },
  ja: { code: 'ja', langLabel: '言語', galleryTitle: 'マイギャラリー', traceTitle: '世界の足跡', navHandshake: '記念品', navGallery: 'ギャラリー', navTrace: '足跡', download: 'ダウンロード', share: '共有', cancel: 'キャンセル' },
  ko: { code: 'ko', langLabel: '언어', galleryTitle: '내 갤러리', traceTitle: '글로벌 흔적', navHandshake: '기념품', navGallery: '갤러리', navTrace: '흔적', download: '다운로드', share: '공유', cancel: '취소' },
  es: { code: 'es', langLabel: 'Idioma', galleryTitle: 'Mi galería', traceTitle: 'Ruta global', navHandshake: 'Recuerdo', navGallery: 'Galería', navTrace: 'Ruta', download: 'Descargar', share: 'Compartir', cancel: 'Cancelar' },
  fr: { code: 'fr', langLabel: 'Langue', galleryTitle: 'Ma galerie', traceTitle: 'Trace globale', navHandshake: 'Souvenir', navGallery: 'Galerie', navTrace: 'Trace', download: 'Télécharger', share: 'Partager', cancel: 'Annuler' },
};

function t(key) {
  return I18N[currentLang]?.[key] || I18N.en[key] || I18N.zh[key] || key;
}

function getDrawingIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('drawing') || params.get('id');
  if (fromQuery) return fromQuery;

  const match = window.location.pathname.match(/\/m\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setAllText(selector, values) {
  document.querySelectorAll(selector).forEach((el, index) => {
    if (values[index] !== undefined) el.textContent = values[index];
  });
}

function applyLanguage() {
  document.documentElement.lang = t('code');
  document.title = t('shareTitle');
  document.querySelector('.mobile-lang-label').textContent = t('langLabel');
  const selector = document.getElementById('mobile-language-select');
  if (selector) selector.value = currentLang;

  setAllText('.souvenir-meta .meta-label', [t('locationLabel'), t('dateLabel'), t('withLabel'), t('themeLabel')]);
  document.querySelector('.souvenir-story-label').textContent = t('storyLabel');
  document.querySelector('#btn-download span:last-child').textContent = t('download');
  document.querySelector('#btn-share span:last-child').textContent = t('share');

  document.querySelector('[data-view="gallery-list"] .title-zh').textContent = t('galleryTitle');
  document.querySelector('[data-view="gallery-list"] .subtitle').textContent = t('gallerySub');
  setAllText('.filter-tab', [t('all'), t('solo'), t('co')]);
  document.querySelector('[data-view="gallery-solo"] .title-zh').textContent = t('soloDetail');
  document.querySelector('[data-view="gallery-solo"] .subtitle').textContent = t('soloDetail');
  document.querySelector('[data-view="gallery-co"] .title-zh').textContent = t('coDetail');
  document.querySelector('[data-view="gallery-co"] .subtitle').textContent = t('coDetail');
  setAllText('.section-divider span', [t('contributionDivider'), t('remarkDivider')]);
  document.getElementById('remark-input').placeholder = t('remarkPlaceholder');
  document.getElementById('btn-send-remark').textContent = t('send');

  document.querySelector('[data-view="trace-map"] .title-zh').textContent = t('traceTitle');
  document.querySelector('[data-view="trace-map"] .subtitle').textContent = t('traceSub');
  setAllText('.stat-label', [t('airports'), t('partners'), t('languages')]);
  const legendItems = document.querySelectorAll('.legend-item');
  if (legendItems[0]) legendItems[0].innerHTML = `<span class="dot solo"></span>${t('soloLegend')}`;
  if (legendItems[1]) legendItems[1].innerHTML = `<span class="dot co"></span>${t('coLegend')}`;
  setAllText('.nav-item span', [t('navHandshake'), t('navGallery'), t('navTrace')]);

  document.querySelector('.modal-sheet h3').textContent = t('shareTo');
  setAllText('.share-item span:last-child', [t('wechat'), t('moments'), 'X', 'Instagram', 'Telegram', t('copyLink')]);
  document.querySelector('.sheet-cancel').textContent = t('cancel');

  if (activeSouvenir) {
    renderSouvenir(activeSouvenir);
  } else if (souvenirStatus === 'loading') {
    renderSouvenirLoading();
  } else if (souvenirStatus === 'error') {
    renderSouvenirError();
  } else {
    setText('souvenir-heading', t('souvenirTitle'));
    setText('souvenir-subtitle', t('souvenirSub'));
  }
  renderGallery(currentGalleryFilter);
  if (currentDetailId) openDetail(currentDetailId);
}

function setActionEnabled(enabled) {
  const downloadBtn = document.getElementById('btn-download');
  const shareBtn = document.getElementById('btn-share');
  if (downloadBtn) downloadBtn.disabled = !enabled;
  if (shareBtn) shareBtn.disabled = !enabled;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getLangFallbacks() {
  const lang = currentLang || 'zh';
  return lang === 'zh' ? ['zh', 'en'] : [lang, 'en', 'zh'];
}

function pickLocalizedValue(source, field) {
  if (!source) return '';
  for (const lang of getLangFallbacks()) {
    const value = source.localized?.[lang]?.[field]
      || source[`${field}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`];
    if (value) return value;
  }
  return source[field] || '';
}

function pickLocalizedOnly(source, field) {
  if (!source) return '';
  for (const lang of getLangFallbacks()) {
    const value = source.localized?.[lang]?.[field]
      || source[`${field}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`];
    if (value) return value;
  }
  return '';
}

function getDrawingStory(drawing) {
  const story = drawing?.metadata?.story || drawing?.story;
  if (!story) return '';
  return pickLocalizedValue(story, 'story');
}

function getDrawingStoryTitle(drawing) {
  const story = drawing?.metadata?.story || drawing?.story;
  if (!story) return '';
  return pickLocalizedValue(story, 'title');
}

function getDrawingTitle(drawing) {
  const metadata = drawing?.metadata || {};
  const generated = metadata.generated || {};
  return pickLocalizedOnly(metadata, 'title')
    || pickLocalizedOnly(generated, 'title')
    || getDrawingStoryTitle(drawing)
    || metadata.title
    || generated.title
    || `Artwork #${String(drawing?.id || '').slice(0, 6)}`;
}

function getDrawingType(drawing) {
  return drawing?.metadata?.type === 'solo' ? 'solo' : 'co';
}

function formatSouvenirDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('justNow');

  return date.toLocaleString(t('code'), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGalleryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('justNow');
  return date.toLocaleDateString(t('code'), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function renderSouvenirLoading() {
  souvenirStatus = 'loading';
  setActionEnabled(false);
  setText('souvenir-heading', t('loadingTitle'));
  setText('souvenir-subtitle', t('loadingSub'));
  setText('souvenir-location', t('localNetwork'));
  setText('souvenir-date', '...');
  setText('souvenir-with', t('terminal'));
  setText('souvenir-theme', t('digitalSouvenir'));
  document.getElementById('souvenir-story')?.classList.add('hidden');

  const art = document.getElementById('souvenir-art');
  if (art) {
    art.innerHTML = `<div class="souvenir-placeholder">${t('loadPlaceholder')}</div>`;
  }
}

function renderSouvenirError() {
  souvenirStatus = 'error';
  activeSouvenir = null;
  setActionEnabled(false);
  setText('souvenir-heading', t('expiredTitle'));
  setText('souvenir-subtitle', t('expiredSub'));
  setText('souvenir-date', t('unavailable'));
  document.getElementById('souvenir-story')?.classList.add('hidden');

  const art = document.getElementById('souvenir-art');
  if (art) {
    art.innerHTML = `<div class="souvenir-error">${t('errorPlaceholder')}</div>`;
  }
}

function renderSouvenir(drawing) {
  souvenirStatus = 'ready';
  activeSouvenir = drawing;
  const drawingType = getDrawingType(drawing);
  const isSolo = drawingType === 'solo';
  document.title = t('shareTitle');
  setActionEnabled(true);
  setText('souvenir-heading', isSolo ? t('soloReadyTitle') : t('coReadyTitle'));
  setText('souvenir-subtitle', isSolo ? t('soloReadySub') : t('coReadySub'));
  setText('souvenir-location', t('localNetwork'));
  setText('souvenir-date', formatSouvenirDate(drawing.createdAt));
  setText('souvenir-with', isSolo ? t('soloDrawing') : t('coTerminal'));
  setText('souvenir-theme', getDrawingTitle(drawing));

  const storyText = getDrawingStory(drawing);
  const storyBox = document.getElementById('souvenir-story');
  const storyEl = document.getElementById('souvenir-story-text');
  if (storyBox && storyEl) {
    storyEl.textContent = storyText;
    storyBox.classList.toggle('hidden', !storyText);
  }

  const art = document.getElementById('souvenir-art');
  if (!art) return;

  art.textContent = '';
  const img = document.createElement('img');
  img.className = 'souvenir-img';
  img.src = drawing.imageUrl;
  img.alt = isSolo ? 'Solo drawing artwork' : 'Co-drawing artwork';
  art.appendChild(img);
}

async function initSouvenirFromUrl() {
  const drawingId = getDrawingIdFromUrl();
  if (!drawingId) return;

  renderSouvenirLoading();
  try {
    const res = await fetch(`/api/drawings/${encodeURIComponent(drawingId)}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.imageUrl) throw new Error(payload.error || `HTTP ${res.status}`);
    renderSouvenir(payload);
    upsertGalleryDrawing(payload);
    renderGallery(currentGalleryFilter);
  } catch (err) {
    console.error('Failed to load drawing:', err);
    renderSouvenirError();
  }
}

function downloadSouvenir() {
  if (!activeSouvenir?.imageUrl) {
    toast(t('scanFirst'));
    return;
  }

  const link = document.createElement('a');
  link.href = activeSouvenir.imageUrl;
  link.download = 'layover-drawing.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast(t('downloading'));
}

async function shareSouvenir() {
  const shareUrl = activeSouvenir?.mobileUrl || window.location.href;
  if (navigator.share && activeSouvenir) {
    try {
      await navigator.share({
        title: t('shareTitle'),
        text: t('shareText'),
        url: shareUrl,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  if (navigator.clipboard && activeSouvenir) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t('linkCopied'));
      return;
    } catch {}
  }

  document.getElementById('share-modal').classList.remove('hidden');
}

// ============ Sample data ============
const GALLERY_ITEMS = [
  {
    id: 'g1', type: 'co', title: 'Home',
    localized: { zh: { title: '家' }, en: { title: 'Home' } },
    date: '2026.05.25', location: 'PVG · Shanghai Pudong',
    partner: 'Yuki · Tokyo',
    art: 'home',
    remarks: [
      { author: 'Yuki', time: '14:35', body: 'Same flight thoughts, see you again somewhere!' },
      { author: 'You', time: '14:38', body: 'I thought of home on the flight, and you completed it.' },
    ],
  },
  {
    id: 'g2', type: 'solo', title: 'A Cat',
    localized: { zh: { title: '一只猫' }, en: { title: 'A Cat' } },
    date: '2026.05.18', location: 'HND · Tokyo Haneda',
    art: 'cat',
    contributions: [
      { name: 'Min-ji', loc: 'ICN · Seoul Incheon', time: '5 days ago' },
      { name: 'Pierre', loc: 'CDG · Paris Charles de Gaulle', time: '2 days ago' },
    ],
  },
  {
    id: 'g3', type: 'co', title: 'Sea & Ship',
    localized: { zh: { title: '海与船' }, en: { title: 'Sea & Ship' } },
    date: '2026.05.10', location: 'SIN · Singapore Changi',
    partner: 'Aishah',
    art: 'sea',
    remarks: [
      { author: 'Aishah', time: '21:02', body: 'Loved how our lines met in the middle.' },
    ],
  },
  {
    id: 'g4', type: 'solo', title: 'A Tree',
    localized: { zh: { title: '一棵树' }, en: { title: 'A Tree' } },
    date: '2026.04.27', location: 'CDG · Paris Charles de Gaulle',
    art: 'tree',
    contributions: [
      { name: 'Lukas', loc: 'FRA · Frankfurt', time: 'Yesterday' },
    ],
  },
  {
    id: 'g5', type: 'co', title: 'Rain',
    localized: { zh: { title: '雨' }, en: { title: 'Rain' } },
    date: '2026.04.14', location: 'ICN · Seoul Incheon',
    partner: 'Soo-yeon',
    art: 'rain',
    remarks: [],
  },
  {
    id: 'g6', type: 'solo', title: 'Noodles',
    localized: { zh: { title: '面条' }, en: { title: 'Noodles' } },
    date: '2026.03.30', location: 'NRT · Tokyo Narita',
    art: 'noodle',
    contributions: [],
  },
];

let galleryItems = [...GALLERY_ITEMS];
let currentGalleryFilter = 'all';
let currentDetailId = null;

function normalizeRemoteGalleryItem(drawing) {
  const story = getDrawingStory(drawing);
  const type = getDrawingType(drawing);
  return {
    id: drawing.id,
    type,
    rawDrawing: drawing,
    title: getDrawingTitle(drawing),
    date: formatGalleryDate(drawing.createdAt),
    location: t('localNetwork'),
    partner: type === 'solo' ? '' : t('coTerminal'),
    imageUrl: drawing.imageUrl,
    mobileUrl: drawing.mobileUrl,
    story,
    remarks: story
      ? [{ author: 'AI Story', time: formatGalleryDate(drawing.createdAt), body: story }]
      : [],
    contributions: [],
    remote: true,
  };
}

function upsertGalleryDrawing(drawing) {
  if (!drawing?.id || !drawing.imageUrl) return;
  const item = normalizeRemoteGalleryItem(drawing);
  galleryItems = [item, ...galleryItems.filter(existing => existing.id !== item.id)];
}

async function loadGlobalGallery() {
  try {
    const res = await fetch('/api/drawings?limit=60');
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(payload.items)) throw new Error(payload.error || `HTTP ${res.status}`);
    const remoteItems = payload.items.map(normalizeRemoteGalleryItem);
    const seen = new Set(remoteItems.map(item => item.id));
    galleryItems = [...remoteItems, ...GALLERY_ITEMS.filter(item => !seen.has(item.id))];
    renderGallery(currentGalleryFilter);
  } catch (err) {
    console.error('Failed to load global gallery:', err);
  }
}

// Airports keyed by real lat/lon; projected into a zoomed Natural Earth map.
// The bounds crop out polar regions and empty ocean so airport locations read clearly on mobile.
const MAP_BOUNDS = { minLon: -130, maxLon: 160, minLat: -45, maxLat: 72 };
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

// labelDx/labelDy push text away from the dot to avoid overlap in dense regions.
const MAP_MARKERS = [
  { code: 'PVG', label: 'PVG · Shanghai',  lat:  31.14, lon:  121.81, type: 'co',   labelDx: -10, labelDy:  10, anchor: 'end' },
  { code: 'ICN', label: 'ICN · Seoul',     lat:  37.46, lon:  126.44, type: 'solo', labelDx: -10, labelDy: -10, anchor: 'end' },
  { code: 'HND', label: 'HND · Haneda',    lat:  35.55, lon:  139.78, type: 'co',   labelDx:  10, labelDy:  12 },
  { code: 'NRT', label: 'NRT · Narita',    lat:  35.77, lon:  140.39, type: 'solo', labelDx:  10, labelDy: -10 },
  { code: 'BKK', label: 'BKK · Bangkok',   lat:  13.69, lon:  100.75, type: 'co',   labelDx: -10, labelDy:  5, anchor: 'end' },
  { code: 'SIN', label: 'SIN · Singapore', lat:   1.36, lon:  103.99, type: 'co',   labelDx:  10, labelDy:  6 },
  { code: 'DXB', label: 'DXB · Dubai',     lat:  25.25, lon:   55.36, type: 'co',   labelDx:  10, labelDy:  5 },
  { code: 'FRA', label: 'FRA · Frankfurt', lat:  50.04, lon:    8.56, type: 'solo', labelDx:  10, labelDy: -8 },
  { code: 'CDG', label: 'CDG · Paris',     lat:  49.01, lon:    2.55, type: 'solo', labelDx: -10, labelDy:  9, anchor: 'end' },
  { code: 'JFK', label: 'JFK · New York',  lat:  40.64, lon:  -73.78, type: 'co',   labelDx:  10, labelDy:  5 },
  { code: 'LAX', label: 'LAX · Los Angeles', lat: 33.94, lon: -118.41, type: 'solo', labelDx: 10, labelDy: 5 },
  { code: 'SYD', label: 'SYD · Sydney',    lat: -33.94, lon:  151.18, type: 'solo', labelDx: -10, labelDy:  5, anchor: 'end' },
];

function projectLatLon(lat, lon) {
  return {
    x: (lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon) * MAP_WIDTH,
    y: (MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) * MAP_HEIGHT,
  };
}

const WORLD_CONTINENTS = '<image href="/mobile/assets/world-map.svg" x="0" y="0" width="1000" height="500" preserveAspectRatio="xMidYMid meet" />';

// ============ SVG art generators ============
function artSVG(kind) {
  const ART = {
    home: `<rect width="300" height="300" fill="#f7fbfa"/>
      <path d="M60 180 L150 100 L240 180" stroke="#071120" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
      <rect x="85" y="180" width="130" height="90" stroke="#071120" stroke-width="3" fill="none"/>
      <rect x="130" y="210" width="40" height="60" stroke="#ff8b72" stroke-width="2.5" fill="none"/>
      <path d="M30 270 L270 270" stroke="#6ed7df" stroke-width="2" fill="none"/>`,
    cat: `<rect width="300" height="300" fill="#f7fbfa"/>
      <circle cx="150" cy="160" r="60" stroke="#071120" stroke-width="3" fill="none"/>
      <path d="M100 120 L90 80 L130 110 M200 120 L210 80 L170 110" stroke="#071120" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <circle cx="130" cy="155" r="4" fill="#071120"/>
      <circle cx="170" cy="155" r="4" fill="#071120"/>
      <path d="M145 175 Q150 182 155 175" stroke="#071120" stroke-width="2" fill="none"/>`,
    sea: `<rect width="300" height="300" fill="#f7fbfa"/>
      <path d="M20 200 Q80 180 150 200 T280 200" stroke="#079aa5" stroke-width="3" fill="none"/>
      <path d="M20 225 Q80 205 150 225 T280 225" stroke="#079aa5" stroke-width="2" fill="none"/>
      <path d="M120 200 L140 130 L180 200 Z" fill="#ff8b72" stroke="#071120" stroke-width="2"/>
      <path d="M100 200 L200 200 L185 220 L115 220 Z" fill="#071120"/>`,
    tree: `<rect width="300" height="300" fill="#f7fbfa"/>
      <rect x="138" y="180" width="24" height="80" fill="#006b74"/>
      <circle cx="150" cy="140" r="60" stroke="#079aa5" stroke-width="3" fill="none"/>
      <circle cx="110" cy="160" r="35" stroke="#079aa5" stroke-width="3" fill="none"/>
      <circle cx="190" cy="160" r="35" stroke="#079aa5" stroke-width="3" fill="none"/>`,
    rain: `<rect width="300" height="300" fill="#f7fbfa"/>
      <ellipse cx="150" cy="85" rx="82" ry="32" stroke="#071120" stroke-width="3" fill="none"/>
      <line x1="80" y1="135" x2="70" y2="175" stroke="#079aa5" stroke-width="2.5"/>
      <line x1="120" y1="145" x2="110" y2="185" stroke="#079aa5" stroke-width="2.5"/>
      <line x1="160" y1="138" x2="150" y2="178" stroke="#079aa5" stroke-width="2.5"/>
      <line x1="200" y1="145" x2="190" y2="185" stroke="#079aa5" stroke-width="2.5"/>`,
    noodle: `<rect width="300" height="300" fill="#f7fbfa"/>
      <ellipse cx="150" cy="200" rx="100" ry="20" stroke="#071120" stroke-width="3" fill="#ffffff"/>
      <path d="M50 200 Q80 100 110 200 Q140 100 170 200 Q200 100 230 200" stroke="#ff8b72" stroke-width="2.5" fill="none"/>
      <path d="M50 200 Q150 240 250 200 L240 230 Q150 260 60 230 Z" fill="#071120"/>`,
  };
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">${ART[kind] || ART.home}</svg>`;
}

function renderMap() {
  const svg = document.getElementById('world-map');
  let markers = '';
  MAP_MARKERS.forEach((m) => {
    const { x, y } = projectLatLon(m.lat, m.lon);
    const color = m.type === 'co' ? '#ff8b72' : '#92a0d3';
    const anchor = m.anchor || 'start';
    const tx = x + (m.labelDx ?? 8);
    const ty = y + (m.labelDy ?? 4);
    const code = escapeHtml(m.code || m.label);
    const title = escapeHtml(m.label || m.code);
    markers += `
      <g class="airport-marker">
        <title>${title}</title>
        <circle cx="${x}" cy="${y}" r="11" fill="${color}" class="pulse" opacity="0.3"/>
        <circle cx="${x}" cy="${y}" r="5.2" fill="${color}" stroke="#fff" stroke-width="1.8" class="map-dot" data-label="${title}"/>
        <text x="${tx}" y="${ty}" text-anchor="${anchor}" class="map-label">${code}</text>
      </g>
    `;
  });
  svg.innerHTML = WORLD_CONTINENTS + markers;
}

// ============ Render gallery ============
function getGalleryTitle(item) {
  if (item.rawDrawing) return getDrawingTitle(item.rawDrawing);
  return item.localized?.[currentLang]?.title || item.localized?.en?.title || item.localized?.zh?.title || item.title;
}

function getGalleryStory(item) {
  if (item.rawDrawing) return getDrawingStory(item.rawDrawing);
  return item.localized?.[currentLang]?.story || item.localized?.en?.story || item.localized?.zh?.story || item.story || '';
}

function getGalleryDate(item) {
  if (item.rawDrawing) return formatGalleryDate(item.rawDrawing.createdAt);
  return item.date;
}

function getGalleryLocation(item) {
  if (item.rawDrawing) return t('localNetwork');
  return item.localized?.[currentLang]?.location || item.location;
}

function getGalleryPartner(item) {
  if (item.rawDrawing) return getDrawingType(item.rawDrawing) === 'solo' ? '' : t('coTerminal');
  return item.localized?.[currentLang]?.partner || item.partner;
}

function getGalleryRemarks(item) {
  const story = getGalleryStory(item);
  if (item.rawDrawing) {
    return story ? [{ author: 'AI Story', time: getGalleryDate(item), body: story }] : [];
  }
  return item.remarks || [];
}

function renderGalleryThumb(item) {
  const title = getGalleryTitle(item);
  if (item.imageUrl) {
    return `<img class="gallery-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`;
  }
  return artSVG(item.art);
}

function renderDetailArtwork(targetId, item) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (item.imageUrl) {
    target.innerHTML = `<img class="detail-img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(getGalleryTitle(item))}" />`;
  } else {
    target.innerHTML = artSVG(item.art);
  }
}

function renderGallery(filter = 'all') {
  currentGalleryFilter = filter;
  const grid = document.getElementById('gallery-grid');
  const items = filter === 'all' ? galleryItems : galleryItems.filter(i => i.type === filter);
  grid.innerHTML = items.map(item => `
    <div class="gallery-card" data-id="${escapeHtml(item.id)}">
      <div class="gallery-thumb">${renderGalleryThumb(item)}</div>
      <div class="gallery-info">
        <div class="gallery-title">${escapeHtml(getGalleryTitle(item))}</div>
        <span class="gallery-tag ${item.type === 'solo' ? 'tag-solo' : 'tag-co'}">
          ${item.type === 'solo' ? t('solo').toUpperCase() : t('co').toUpperCase()}
        </span>
        <div class="gallery-date">${escapeHtml(getGalleryDate(item))}</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function openDetail(id) {
  const item = galleryItems.find(i => i.id === id);
  if (!item) return;
  currentDetailId = id;
  if (item.type === 'solo') {
    renderDetailArtwork('solo-art', item);
    document.getElementById('solo-title').textContent = getGalleryTitle(item);
    document.getElementById('solo-meta').textContent = `${getGalleryDate(item)} · ${getGalleryLocation(item)}`;
    const list = document.getElementById('solo-contributions');
    if (!item.contributions || item.contributions.length === 0) {
      list.innerHTML = `<p style="color:var(--ink-mute);font-size:13px;text-align:center;padding:16px;">${t('noContributions')}</p>`;
    } else {
      list.innerHTML = item.contributions.map(c => `
        <div class="contribution-item">
          <div class="contribution-thumb">${artSVG('cat')}</div>
          <div class="contribution-meta">
            <div class="contribution-name">${escapeHtml(c.name)}</div>
            <div class="contribution-loc">${escapeHtml(c.loc)}</div>
          </div>
          <div class="contribution-time">${escapeHtml(c.time)}</div>
        </div>
      `).join('');
    }
    showView('gallery', 'gallery-solo');
  } else {
    renderDetailArtwork('co-art', item);
    document.getElementById('co-title').textContent = getGalleryTitle(item);
    document.getElementById('co-meta').textContent = `${getGalleryDate(item)} · ${getGalleryLocation(item)} · ${getGalleryPartner(item)}`;
    renderRemarks(item);
    document.getElementById('btn-send-remark').onclick = () => {
      const input = document.getElementById('remark-input');
      const val = input.value.trim();
      if (!val) return;
      item.remarks.push({ author: 'You', time: 'Just now', body: val });
      input.value = '';
      renderRemarks(item);
      toast(t('send'));
    };
    showView('gallery', 'gallery-co');
  }
}

function renderRemarks(item) {
  const list = document.getElementById('co-remarks');
  const remarks = getGalleryRemarks(item);
  if (!remarks || remarks.length === 0) {
    list.innerHTML = `<p style="color:var(--ink-mute);font-size:13px;text-align:center;padding:16px;">${t('noRemarks')}</p>`;
    return;
  }
  list.innerHTML = remarks.map(r => `
    <div class="remark-item">
      <div class="remark-header">
        <span class="remark-author">${escapeHtml(r.author)}</span>
        <span class="remark-time">${escapeHtml(r.time)}</span>
      </div>
      <div class="remark-body">${escapeHtml(r.body)}</div>
    </div>
  `).join('');
}

// ============ Navigation ============
function showScreen(name) {
  currentDetailId = null;
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('hidden', s.dataset.screen !== name);
  });
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.nav === name);
  });
  // Reset to first view of that screen
  const screen = document.querySelector(`.screen[data-screen="${name}"]`);
  if (screen) {
    const views = screen.querySelectorAll('.view');
    views.forEach((v, idx) => v.classList.toggle('hidden', idx !== 0));
  }
}

function showView(screenName, viewName) {
  if (screenName === 'gallery' && viewName === 'gallery-list') currentDetailId = null;
  const screen = document.querySelector(`.screen[data-screen="${screenName}"]`);
  screen.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('hidden', v.dataset.view !== viewName);
  });
}

// ============ Toast ============
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1600);
}

// ============ Wire up ============
document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('mobile-language-select');
  if (languageSelect) {
    languageSelect.value = I18N[currentLang] ? currentLang : 'zh';
    currentLang = languageSelect.value;
    languageSelect.addEventListener('change', () => {
      currentLang = languageSelect.value;
      localStorage.setItem('layover-mobile-lang', currentLang);
      applyLanguage();
    });
  }

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.nav));
  });

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.closest('.screen').dataset.screen;
      showView(screen, btn.dataset.back);
    });
  });

  // Souvenir download / share
  document.getElementById('btn-download').addEventListener('click', downloadSouvenir);
  document.getElementById('btn-share').addEventListener('click', shareSouvenir);

  // Modal close
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('share-modal').classList.add('hidden');
    });
  });

  // Share items
  document.querySelectorAll('.share-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('share-modal').classList.add('hidden');
      toast(t('shared'));
    });
  });

  // Gallery filters
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGallery(tab.dataset.filter);
    });
  });

  // Initial render
  applyLanguage();
  initSouvenirFromUrl();
  renderGallery('all');
  loadGlobalGallery();
  renderMap();
});
