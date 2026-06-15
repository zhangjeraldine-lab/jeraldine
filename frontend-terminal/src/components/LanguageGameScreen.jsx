import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import { speakNaturally, stopSpeech } from '@/utils/speech';
import { getLanguageName, getSpeechLang, isRTL, normalizeLang } from '@/utils/language';
import '../styles/LanguageGame.css';

// ── Stroke interpolation (same algorithm as 765.html) ─────────────────────────
function createStroke(pts) {
  const path = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(5, Math.floor(dist / 2));
    for (let j = 0; j < steps; j++) {
      path.push({
        x: p1.x + (p2.x - p1.x) * (j / steps),
        y: p1.y + (p2.y - p1.y) * (j / steps),
      });
    }
  }
  path.push(pts[pts.length - 1]);
  return path;
}

// ── Word database with stroke paths (300×300 coordinate space) ────────────────
const GAME_WORDS = [
  {
    key: 'water',
    emoji: '💧',
    words: {
      zh: { text: '水', phonetic: 'shuǐ' },
      en: { text: 'water' },
      ja: { text: '水', phonetic: 'mizu' },
      ko: { text: '물', phonetic: 'mul' },
      es: { text: 'agua' },
      fr: { text: 'eau' },
      de: { text: 'Wasser' },
      ar: { text: 'ماء', phonetic: 'ma' },
    },
    strokes: [
      createStroke([{x:150,y:40},{x:150,y:240},{x:115,y:210}]),
      createStroke([{x:75,y:120},{x:125,y:100},{x:75,y:185}]),
      createStroke([{x:210,y:95},{x:165,y:145}]),
      createStroke([{x:165,y:145},{x:235,y:235}]),
    ],
  },
  {
    key: 'person',
    emoji: '🧑',
    words: {
      zh: { text: '人', phonetic: 'rén' },
      en: { text: 'person' },
      ja: { text: '人', phonetic: 'hito' },
      ko: { text: '사람', phonetic: 'saram' },
      es: { text: 'persona' },
      fr: { text: 'personne' },
      de: { text: 'Mensch' },
      ar: { text: 'شخص', phonetic: 'shakhs' },
    },
    strokes: [
      createStroke([{x:160,y:70},{x:88,y:242}]),
      createStroke([{x:160,y:70},{x:232,y:242}]),
    ],
  },
  {
    key: 'mountain',
    emoji: '⛰️',
    words: {
      zh: { text: '山', phonetic: 'shān' },
      en: { text: 'mountain' },
      ja: { text: '山', phonetic: 'yama' },
      ko: { text: '산', phonetic: 'san' },
      es: { text: 'montaña' },
      fr: { text: 'montagne' },
      de: { text: 'Berg' },
      ar: { text: 'جبل', phonetic: 'jabal' },
    },
    strokes: [
      createStroke([{x:85,y:155},{x:85,y:258}]),
      createStroke([{x:150,y:55},{x:150,y:258}]),
      createStroke([{x:215,y:155},{x:215,y:258}]),
    ],
  },
  {
    key: 'sun',
    emoji: '☀️',
    words: {
      zh: { text: '日', phonetic: 'rì' },
      en: { text: 'sun' },
      ja: { text: '日', phonetic: 'hi' },
      ko: { text: '해', phonetic: 'hae' },
      es: { text: 'sol' },
      fr: { text: 'soleil' },
      de: { text: 'Sonne' },
      ar: { text: 'شمس', phonetic: 'shams' },
    },
    strokes: [
      createStroke([{x:92,y:70},{x:92,y:230}]),
      createStroke([{x:92,y:70},{x:208,y:70},{x:208,y:230}]),
      createStroke([{x:92,y:150},{x:208,y:150}]),
      createStroke([{x:92,y:230},{x:208,y:230}]),
    ],
  },
  {
    key: 'moon',
    emoji: '🌙',
    words: {
      zh: { text: '月', phonetic: 'yuè' },
      en: { text: 'moon' },
      ja: { text: '月', phonetic: 'tsuki' },
      ko: { text: '달', phonetic: 'dal' },
      es: { text: 'luna' },
      fr: { text: 'lune' },
      de: { text: 'Mond' },
      ar: { text: 'قمر', phonetic: 'qamar' },
    },
    strokes: [
      createStroke([{x:115,y:55},{x:102,y:248}]),
      createStroke([{x:115,y:55},{x:205,y:55},{x:205,y:238},{x:192,y:252}]),
      createStroke([{x:132,y:132},{x:198,y:132}]),
      createStroke([{x:132,y:188},{x:198,y:188}]),
    ],
  },
  {
    key: 'tree',
    emoji: '🌲',
    words: {
      zh: { text: '木', phonetic: 'mù' },
      en: { text: 'tree' },
      ja: { text: '木', phonetic: 'ki' },
      ko: { text: '나무', phonetic: 'namu' },
      es: { text: 'arbol' },
      fr: { text: 'arbre' },
      de: { text: 'Baum' },
      ar: { text: 'شجرة', phonetic: 'shajara' },
    },
    strokes: [
      createStroke([{x:68,y:118},{x:232,y:118}]),
      createStroke([{x:150,y:50},{x:150,y:268}]),
      createStroke([{x:150,y:190},{x:78,y:272}]),
      createStroke([{x:150,y:190},{x:222,y:272}]),
    ],
  },
  {
    key: 'fire',
    emoji: '🔥',
    words: {
      zh: { text: '火', phonetic: 'huǒ' },
      en: { text: 'fire' },
      ja: { text: '火', phonetic: 'hi' },
      ko: { text: '불', phonetic: 'bul' },
      es: { text: 'fuego' },
      fr: { text: 'feu' },
      de: { text: 'Feuer' },
      ar: { text: 'نار', phonetic: 'nar' },
    },
    strokes: [
      createStroke([{x:108,y:178},{x:70,y:258}]),
      createStroke([{x:150,y:68},{x:126,y:130},{x:175,y:200},{x:232,y:258}]),
      createStroke([{x:126,y:130},{x:108,y:178}]),
      createStroke([{x:200,y:152},{x:225,y:192}]),
    ],
  },
];

const STROKE_GUIDE_LANGS = new Set(['zh', 'ja']);

const UI_COPY = {
  zh: {
    eyebrow: 'Layover · 语言交换',
    homeTitle: '返回主页',
    drawTitle: '画给对方看',
    drawSub: (lang) => `你正在教对方 ${lang}`,
    traceWaitTitle: '你的伙伴正在临摹',
    traceWaitSub: (word) => `对方正在学习「${word}」`,
    taughtTitle: '你教会了 TA！',
    taughtSub: (lang) => `你教会了对方一个 ${lang} 词`,
    drawThis: '画这个',
    doneDrawing: '完成',
    back: '返回',
    waitText: '对方正在画…',
    waitSub: '等待对方画图',
    traceEyebrow: '临摹',
    traceTitle: (word) => `临摹「${word}」`,
    strokeTraceSub: '从蓝点开始，按顺序描每一笔',
    textTraceSub: '照着淡色文字描一遍',
    strokeTraceHint: '描不准没关系，重新从蓝点开始',
    textTraceHint: '照着文字临摹，完成后点下面按钮',
    doneTracing: '完成临摹',
    revealBadge: '你学会了！',
    repeat: '再听一遍',
    playAgain: '再来一次',
  },
  en: {
    eyebrow: 'Layover · Language exchange',
    homeTitle: 'Home',
    drawTitle: 'Draw for your partner',
    drawSub: (lang) => `You are teaching ${lang}`,
    traceWaitTitle: 'Your partner is tracing',
    traceWaitSub: (word) => `Your partner is learning "${word}"`,
    taughtTitle: 'You taught them!',
    taughtSub: (lang) => `You taught your partner a ${lang} word`,
    drawThis: 'Draw this',
    doneDrawing: 'Done Drawing',
    back: 'Back',
    waitText: 'Your partner is drawing…',
    waitSub: 'Waiting for the drawing',
    traceEyebrow: 'Trace It',
    traceTitle: (word) => `Trace "${word}"`,
    strokeTraceSub: 'Start from the blue dot and follow the stroke order',
    textTraceSub: 'Trace over the faint word',
    strokeTraceHint: 'Retry from the dot if you go off-track',
    textTraceHint: 'Trace the word, then tap done',
    doneTracing: 'Done Tracing',
    revealBadge: 'You learned it!',
    repeat: 'Repeat',
    playAgain: 'Play Again',
  },
  ja: {
    eyebrow: 'Layover · 言語交換',
    homeTitle: 'ホームへ戻る',
    drawTitle: '相手に描いて見せる',
    drawSub: (lang) => `${lang}を教えています`,
    traceWaitTitle: '相手がなぞっています',
    traceWaitSub: (word) => `相手は「${word}」を学んでいます`,
    taughtTitle: '教えられました！',
    taughtSub: (lang) => `${lang}の言葉を相手に教えました`,
    drawThis: 'これを描く',
    doneDrawing: '描き終わり',
    back: '戻る',
    waitText: '相手が描いています…',
    waitSub: '描き終わるまで待ってください',
    traceEyebrow: 'なぞる',
    traceTitle: (word) => `「${word}」をなぞる`,
    strokeTraceSub: '青い点から始めて、筆順どおりになぞります',
    textTraceSub: '薄い文字の上をなぞります',
    strokeTraceHint: 'ずれたら青い点からやり直せます',
    textTraceHint: '文字をなぞったら完了を押してください',
    doneTracing: 'なぞり終わり',
    revealBadge: '覚えました！',
    repeat: 'もう一度聞く',
    playAgain: 'もう一度',
  },
  ko: {
    eyebrow: 'Layover · 언어 교환',
    homeTitle: '홈으로',
    drawTitle: '상대에게 그려 주세요',
    drawSub: (lang) => `${lang} 단어를 가르치는 중`,
    traceWaitTitle: '상대가 따라 쓰는 중',
    traceWaitSub: (word) => `상대가 "${word}"를 배우고 있어요`,
    taughtTitle: '가르쳤어요!',
    taughtSub: (lang) => `${lang} 단어를 상대에게 알려 줬어요`,
    drawThis: '이것을 그리기',
    doneDrawing: '그리기 완료',
    back: '뒤로',
    waitText: '상대가 그리고 있어요…',
    waitSub: '그림을 기다리는 중',
    traceEyebrow: '따라 쓰기',
    traceTitle: (word) => `"${word}" 따라 쓰기`,
    strokeTraceSub: '파란 점에서 시작해 획 순서대로 따라 쓰세요',
    textTraceSub: '연한 글자를 따라 써 보세요',
    strokeTraceHint: '벗어나면 파란 점에서 다시 시작하세요',
    textTraceHint: '글자를 따라 쓴 뒤 완료를 누르세요',
    doneTracing: '따라 쓰기 완료',
    revealBadge: '배웠어요!',
    repeat: '다시 듣기',
    playAgain: '다시 하기',
  },
  es: {
    eyebrow: 'Layover · Intercambio de idiomas',
    homeTitle: 'Inicio',
    drawTitle: 'Dibuja para tu compañero',
    drawSub: (lang) => `Estás enseñando ${lang}`,
    traceWaitTitle: 'Tu compañero está trazando',
    traceWaitSub: (word) => `Tu compañero aprende "${word}"`,
    taughtTitle: '¡Lo enseñaste!',
    taughtSub: (lang) => `Enseñaste una palabra en ${lang}`,
    drawThis: 'Dibuja esto',
    doneDrawing: 'Terminé',
    back: 'Volver',
    waitText: 'Tu compañero está dibujando…',
    waitSub: 'Esperando el dibujo',
    traceEyebrow: 'Trazar',
    traceTitle: (word) => `Traza "${word}"`,
    strokeTraceSub: 'Empieza en el punto azul y sigue el orden de trazos',
    textTraceSub: 'Traza sobre la palabra tenue',
    strokeTraceHint: 'Si te sales, vuelve al punto azul',
    textTraceHint: 'Traza la palabra y toca terminar',
    doneTracing: 'Terminar trazado',
    revealBadge: '¡Lo aprendiste!',
    repeat: 'Repetir',
    playAgain: 'Jugar otra vez',
  },
  fr: {
    eyebrow: 'Layover · Échange linguistique',
    homeTitle: 'Accueil',
    drawTitle: 'Dessinez pour votre partenaire',
    drawSub: (lang) => `Vous enseignez ${lang}`,
    traceWaitTitle: 'Votre partenaire trace',
    traceWaitSub: (word) => `Votre partenaire apprend « ${word} »`,
    taughtTitle: 'Vous lui avez appris !',
    taughtSub: (lang) => `Vous avez appris un mot en ${lang}`,
    drawThis: 'Dessinez ceci',
    doneDrawing: 'Dessin terminé',
    back: 'Retour',
    waitText: 'Votre partenaire dessine…',
    waitSub: 'En attente du dessin',
    traceEyebrow: 'Tracer',
    traceTitle: (word) => `Tracez « ${word} »`,
    strokeTraceSub: "Commencez au point bleu et suivez l'ordre des traits",
    textTraceSub: 'Tracez sur le mot en filigrane',
    strokeTraceHint: 'Si vous déviez, repartez du point bleu',
    textTraceHint: 'Tracez le mot, puis validez',
    doneTracing: 'Traçage terminé',
    revealBadge: 'Vous l’avez appris !',
    repeat: 'Réécouter',
    playAgain: 'Rejouer',
  },
  de: {
    eyebrow: 'Layover · Sprachaustausch',
    homeTitle: 'Startseite',
    drawTitle: 'Zeichne für deinen Partner',
    drawSub: (lang) => `Du vermittelst ${lang}`,
    traceWaitTitle: 'Dein Partner zeichnet nach',
    traceWaitSub: (word) => `Dein Partner lernt "${word}"`,
    taughtTitle: 'Du hast es beigebracht!',
    taughtSub: (lang) => `Du hast ein Wort auf ${lang} beigebracht`,
    drawThis: 'Zeichne das',
    doneDrawing: 'Zeichnung fertig',
    back: 'Zurück',
    waitText: 'Dein Partner zeichnet…',
    waitSub: 'Warten auf die Zeichnung',
    traceEyebrow: 'Nachzeichnen',
    traceTitle: (word) => `"${word}" nachzeichnen`,
    strokeTraceSub: 'Beginne am blauen Punkt und folge der Strichfolge',
    textTraceSub: 'Zeichne das helle Wort nach',
    strokeTraceHint: 'Wenn es nicht passt, starte wieder am blauen Punkt',
    textTraceHint: 'Zeichne das Wort nach und tippe dann auf Fertig',
    doneTracing: 'Fertig',
    revealBadge: 'Gelernt!',
    repeat: 'Noch einmal hören',
    playAgain: 'Noch einmal',
  },
  ar: {
    eyebrow: 'Layover · تبادل لغوي',
    homeTitle: 'الرئيسية',
    drawTitle: 'ارسم لشريكك',
    drawSub: (lang) => `أنت تعلّم ${lang}`,
    traceWaitTitle: 'شريكك يتتبع الكلمة',
    traceWaitSub: (word) => `شريكك يتعلم "${word}"`,
    taughtTitle: 'لقد علّمته!',
    taughtSub: (lang) => `علّمت شريكك كلمة باللغة ${lang}`,
    drawThis: 'ارسم هذا',
    doneDrawing: 'انتهيت من الرسم',
    back: 'رجوع',
    waitText: 'شريكك يرسم…',
    waitSub: 'في انتظار الرسم',
    traceEyebrow: 'تتبع',
    traceTitle: (word) => `تتبع "${word}"`,
    strokeTraceSub: 'ابدأ من النقطة الزرقاء واتبع ترتيب الخطوط',
    textTraceSub: 'تتبع الكلمة الباهتة',
    strokeTraceHint: 'إذا خرجت عن المسار، ابدأ من النقطة الزرقاء',
    textTraceHint: 'تتبع الكلمة ثم اضغط تم',
    doneTracing: 'تم التتبع',
    revealBadge: 'لقد تعلمتها!',
    repeat: 'استمع مرة أخرى',
    playAgain: 'العب مرة أخرى',
  },
};

const getCopy = (lang) => UI_COPY[normalizeLang(lang)] || UI_COPY.en;
const getWordForLang = (word, lang) => word.words[normalizeLang(lang)] || word.words.en;
const usesStrokeGuideFor = (lang) => STROKE_GUIDE_LANGS.has(normalizeLang(lang));

const getNearestPathPoint = (pos, path, start = 0, end = path.length - 1) => {
  let best = null;
  let bestDist = Infinity;
  const from = Math.max(0, start);
  const to = Math.min(path.length - 1, end);

  for (let i = from; i <= to; i++) {
    const p = path[i];
    const dist = Math.hypot(pos.x - p.x, pos.y - p.y);
    if (dist < bestDist) {
      best = { x: p.x, y: p.y, index: i, dist };
      bestDist = dist;
    }
  }

  return best;
};

const getTraceTextLayout = (W, H, text, phonetic) => {
  const count = Math.max(1, Array.from(text || '').length);
  const wideWord = count > 7;
  const fontSize = Math.max(36, Math.min(96, (W * 0.72) / Math.max(2.6, count * 0.58)));
  const y = phonetic ? H * 0.47 : H * 0.52;
  return {
    fontSize: wideWord ? fontSize * 0.88 : fontSize,
    phoneticSize: Math.max(16, Math.min(28, fontSize * 0.28)),
    x: W / 2,
    y,
    phoneticY: y + fontSize * 0.62,
  };
};

const drawTraceText = (ctx, W, H, text, phonetic, rtl, mode = 'guide') => {
  const layout = getTraceTextLayout(W, H, text, phonetic);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.font = `900 ${layout.fontSize}px "Avenir Next", "Inter", "Noto Sans SC", "Noto Sans Arabic", sans-serif`;

  if (mode === 'mask') {
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = Math.max(18, layout.fontSize * 0.28);
    ctx.strokeText(text, layout.x, layout.y);
    ctx.fillText(text, layout.x, layout.y);
  } else {
    ctx.strokeStyle = 'rgba(7, 154, 165, 0.08)';
    ctx.fillStyle = 'rgba(7, 154, 165, 0.16)';
    ctx.lineWidth = Math.max(14, layout.fontSize * 0.2);
    ctx.strokeText(text, layout.x, layout.y);
    ctx.fillText(text, layout.x, layout.y);
  }

  if (phonetic) {
    ctx.font = `800 ${layout.phoneticSize}px "Avenir Next", "Inter", sans-serif`;
    ctx.fillStyle = mode === 'mask' ? '#000' : 'rgba(7, 17, 32, 0.2)';
    ctx.fillText(phonetic, layout.x, layout.phoneticY);
  }
  ctx.restore();
};

// ── TTS ───────────────────────────────────────────────────────────────────────
function speakWord(text, lang, onDone, pan = 1) {
  const isCjk = /^(zh|ja|ko)/i.test(lang);
  return speakNaturally(text, lang, {
    channelId: 'language-game',
    onDone,
    pan,
    rate: isCjk ? 0.9 : 0.95,
    pitch: isCjk ? 1.07 : 1.03,
    instruction: '自然准确地朗读这个词，发音清晰，语气友好。',
  });
}

// ── Reveal panel ──────────────────────────────────────────────────────────────
const RevealPanel = ({ word, targetLang, learnerLang, onPlayAgain, pan = 1 }) => {
  const targetWord = getWordForLang(word, targetLang);
  const compareLang = normalizeLang(learnerLang) === normalizeLang(targetLang) ? 'en' : learnerLang;
  const compareWord = getWordForLang(word, compareLang);
  const copy = getCopy(learnerLang);
  const targetIsRTL = isRTL(targetLang);
  const compareIsRTL = isRTL(compareLang);

  useEffect(() => {
    let cancelled = false;
    let cancelCurrentSpeech = () => {};
    let nextTimer;

    const t = setTimeout(() => {
      if (cancelled) return;
      cancelCurrentSpeech = speakWord(targetWord.text, getSpeechLang(targetLang), () => {
        nextTimer = setTimeout(() => {
          if (!cancelled) cancelCurrentSpeech = speakWord(compareWord.text, getSpeechLang(compareLang), undefined, pan);
        }, 700);
      }, pan);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(nextTimer);
      cancelCurrentSpeech();
      stopSpeech('language-game');
    };
  }, [compareLang, compareWord.text, pan, targetLang, targetWord.text]);

  const speakPair = () =>
    speakWord(targetWord.text, getSpeechLang(targetLang), () =>
      setTimeout(() => speakWord(compareWord.text, getSpeechLang(compareLang), undefined, pan), 700),
    pan);

  return (
    <div className="lg-reveal">
      <div className="reveal-badge">{copy.revealBadge}</div>
      <div className="reveal-char-wrap" dir={targetIsRTL ? 'rtl' : 'ltr'}>
        <div className={`reveal-char-glow ${targetWord.text.length > 1 ? 'reveal-word-glow' : ''}`}>
          {targetWord.text}
        </div>
        {targetWord.phonetic && <div className="reveal-pinyin">{targetWord.phonetic}</div>}
      </div>
      <div className="reveal-equals">＝</div>
      <div className="reveal-en" dir={compareIsRTL ? 'rtl' : 'ltr'}>{compareWord.text}</div>
      <div className="reveal-actions">
        <button
          className="reveal-speak-btn"
          onClick={speakPair}
        >
          🔊 {copy.repeat}
        </button>
        <button className="reveal-again-btn" onClick={onPlayAgain}>
          ↩ {copy.playAgain}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const LanguageGameScreen = () => {
  const { setAppState, leftLanguage, rightLanguage } = useAppStore();
  const [phase, setPhase] = useState('draw');
  const [word, setWord] = useState(() => GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)]);
  const [aHasStrokes, setAHasStrokes] = useState(false);
  const [bHasTraceMarks, setBHasTraceMarks] = useState(false);
  const [drawingPreview, setDrawingPreview] = useState(null);
  // 'left' = drawer occupies the rotated panel; flips after each completed round
  const [drawerSide, setDrawerSide] = useState('left');

  const leftLang = normalizeLang(leftLanguage, 'zh');
  const rightLang = normalizeLang(rightLanguage, 'en');
  const targetLang = drawerSide === 'left' ? leftLang : rightLang;
  const learnerLang = drawerSide === 'left' ? rightLang : leftLang;
  const targetWord = getWordForLang(word, targetLang);
  const compareLang = normalizeLang(learnerLang) === normalizeLang(targetLang) ? 'en' : learnerLang;
  const compareWord = getWordForLang(word, compareLang);
  const usesStrokeGuide = usesStrokeGuideFor(targetLang);
  const targetLanguageName = getLanguageName(targetLang);
  const drawerCopy = getCopy(targetLang);
  const learnerCopy = getCopy(learnerLang);
  const targetIsRTL = isRTL(targetLang);
  const compareIsRTL = isRTL(compareLang);
  const learnerPan = drawerSide === 'left' ? 1 : -1;

  // A's canvas (left panel, CSS-rotated 180°)
  const aCanvasRef = useRef(null);
  const aCtxRef = useRef(null);
  const aDrawRef = useRef({ active: false, prev: [0, 0] });
  const [aColor, setAColor] = useState('#1d1d1d');
  const [aSize, setASize] = useState(10);

  // B's tracing area (right panel, normal orientation)
  const bAreaRef = useRef(null);
  const staticCanvasRef = useRef(null); // all strokes faint gray
  const hintCanvasRef = useRef(null);   // current stroke medium gray
  const finalCanvasRef = useRef(null);  // committed strokes blue
  const drawCanvasRef = useRef(null);   // user's current stroke
  const dotRef = useRef(null);          // blue start dot

  // Mutable tracing state (refs for perf — no re-render needed)
  const scaleRef = useRef({ sx: 1, sy: 1 });
  const scaledStrokesRef = useRef([]);
  const curStrokeRef = useRef(0);
  const checkProgressRef = useRef(0);
  const isBDrawingRef = useRef(false);
  const userPointsRef = useRef([]);
  const textMaskRef = useRef(null);

  // Init A's canvas on mount and after a side-swap moves it to the other panel
  useEffect(() => {
    const ac = aCanvasRef.current;
    if (!ac) return;
    const p = ac.parentElement;
    ac.width = p.clientWidth;
    ac.height = p.clientHeight;
    aCtxRef.current = ac.getContext('2d');
  }, [drawerSide]);

  // ── Tracing helpers (defined before useEffect that calls them) ───────────────

  const showCurrentHint = useCallback(() => {
    const curIdx = curStrokeRef.current;
    const scaledStrokes = scaledStrokesRef.current;
    if (curIdx >= scaledStrokes.length) return;

    const hCanvas = hintCanvasRef.current;
    if (!hCanvas) return;
    const hCtx = hCanvas.getContext('2d');
    hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);

    const path = scaledStrokes[curIdx];
    hCtx.beginPath();
    hCtx.strokeStyle = '#bbbbbb';
    hCtx.lineWidth = 24;
    hCtx.lineCap = 'round';
    hCtx.lineJoin = 'round';
    hCtx.moveTo(path[0].x, path[0].y);
    path.forEach(p => hCtx.lineTo(p.x, p.y));
    hCtx.stroke();

    if (dotRef.current) {
      dotRef.current.style.display = 'block';
      dotRef.current.style.left = `${path[0].x}px`;
      dotRef.current.style.top = `${path[0].y}px`;
    }
  }, []);

  const renderUserStroke = useCallback(() => {
    const pts = userPointsRef.current;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = '#0EA5A0';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.stroke();
  }, []);

  const commitStroke = useCallback(() => {
    const curIdx = curStrokeRef.current;
    const scaledStrokes = scaledStrokesRef.current;
    const path = scaledStrokes[curIdx];

    // Draw committed stroke in blue on finalCanvas
    const fCanvas = finalCanvasRef.current;
    if (!fCanvas) return;
    const fCtx = fCanvas.getContext('2d');
    fCtx.beginPath();
    fCtx.strokeStyle = '#0EA5A0';
    fCtx.lineWidth = 24;
    fCtx.lineCap = 'round';
    fCtx.lineJoin = 'round';
    fCtx.moveTo(path[0].x, path[0].y);
    path.forEach(p => fCtx.lineTo(p.x, p.y));
    fCtx.stroke();

    // Clear draw canvas
    const dCanvas = drawCanvasRef.current;
    if (dCanvas) dCanvas.getContext('2d').clearRect(0, 0, dCanvas.width, dCanvas.height);

    curStrokeRef.current++;
    checkProgressRef.current = 0;
    userPointsRef.current = [];

    if (curStrokeRef.current >= scaledStrokes.length) {
      if (dotRef.current) dotRef.current.style.display = 'none';
      const hCanvas = hintCanvasRef.current;
      if (hCanvas) hCanvas.getContext('2d').clearRect(0, 0, hCanvas.width, hCanvas.height);
      setTimeout(() => setPhase('reveal'), 600);
    } else {
      showCurrentHint();
    }
  }, [showCurrentHint]);

  // Init B's tracing canvases when phase → 'trace'
  useEffect(() => {
    if (phase !== 'trace') return;
    let rafId = requestAnimationFrame(() => {
      const area = bAreaRef.current;
      if (!area || area.clientWidth === 0) return;

      const W = area.clientWidth;
      const H = area.clientHeight;

      [staticCanvasRef, hintCanvasRef, finalCanvasRef, drawCanvasRef].forEach(r => {
        if (r.current) { r.current.width = W; r.current.height = H; }
      });

      const sx = W / 300;
      const sy = H / 300;
      scaleRef.current = { sx, sy };
      scaledStrokesRef.current = word.strokes.map(path =>
        path.map(p => ({ x: p.x * sx, y: p.y * sy }))
      );
      curStrokeRef.current = 0;
      checkProgressRef.current = 0;
      userPointsRef.current = [];
      isBDrawingRef.current = false;
      textMaskRef.current = null;
      setBHasTraceMarks(false);

      if (!usesStrokeGuide) {
        scaledStrokesRef.current = [];
        if (dotRef.current) dotRef.current.style.display = 'none';
        [staticCanvasRef, hintCanvasRef, finalCanvasRef, drawCanvasRef].forEach(r => {
          if (r.current) r.current.getContext('2d').clearRect(0, 0, W, H);
        });
        const sCanvas = staticCanvasRef.current;
        if (sCanvas) {
          drawTraceText(
            sCanvas.getContext('2d'),
            W,
            H,
            targetWord.text,
            targetWord.phonetic,
            targetIsRTL,
            'guide'
          );
        }
        const mask = document.createElement('canvas');
        mask.width = W;
        mask.height = H;
        const maskCtx = mask.getContext('2d');
        drawTraceText(maskCtx, W, H, targetWord.text, targetWord.phonetic, targetIsRTL, 'mask');
        textMaskRef.current = {
          W,
          H,
          data: maskCtx.getImageData(0, 0, W, H).data,
        };
        return;
      }

      // Draw all strokes faint gray on staticCanvas
      const sCanvas = staticCanvasRef.current;
      if (sCanvas) {
        const sCtx = sCanvas.getContext('2d');
        sCtx.clearRect(0, 0, W, H);
        sCtx.strokeStyle = '#eeeeee';
        sCtx.lineWidth = 24;
        sCtx.lineCap = 'round';
        sCtx.lineJoin = 'round';
        scaledStrokesRef.current.forEach(path => {
          sCtx.beginPath();
          sCtx.moveTo(path[0].x, path[0].y);
          path.forEach(p => sCtx.lineTo(p.x, p.y));
          sCtx.stroke();
        });
      }

      showCurrentHint();
    });
    return () => cancelAnimationFrame(rafId);
  }, [phase, word, showCurrentHint, usesStrokeGuide, targetWord.text, targetWord.phonetic, targetIsRTL]);

  // ── A drawing ──────────────────────────────────────────────────────────────

  const getAPos = useCallback((e) => {
    const canvas = aCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const rawX = (src.clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (src.clientY - rect.top) * (canvas.height / rect.height);
    // Drawer canvas sits in the rotated panel only when drawerSide === 'left';
    // in that case the visual frame is 180° from the canvas buffer, so mirror.
    const rotated = drawerSide === 'left';
    const x = rotated ? canvas.width - rawX : rawX;
    const y = rotated ? canvas.height - rawY : rawY;
    return {
      x: Math.max(0, Math.min(x, canvas.width - 1)),
      y: Math.max(0, Math.min(y, canvas.height - 1)),
    };
  }, [drawerSide]);

  const handleAStart = useCallback((e) => {
    if (phase !== 'draw') return;
    e.preventDefault();
    const { x, y } = getAPos(e);
    aDrawRef.current = { active: true, prev: [x, y] };
    const ctx = aCtxRef.current;
    ctx.save();
    ctx.fillStyle = aColor;
    ctx.beginPath();
    ctx.arc(x, y, aSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [phase, aColor, aSize, getAPos]);

  const handleAMove = useCallback((e) => {
    if (!aDrawRef.current.active) return;
    e.preventDefault();
    const { x, y } = getAPos(e);
    const [px, py] = aDrawRef.current.prev;
    const ctx = aCtxRef.current;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = aSize;
    ctx.strokeStyle = aColor;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    aDrawRef.current.prev = [x, y];
  }, [aColor, aSize, getAPos]);

  const handleAEnd = useCallback(() => {
    if (!aDrawRef.current.active) return;
    aDrawRef.current.active = false;
    setAHasStrokes(true);
  }, []);

  const handleFinishDrawing = useCallback(() => {
    const canvas = aCanvasRef.current;
    if (canvas) {
      setDrawingPreview(canvas.toDataURL('image/png'));
    }
    setPhase('trace');
  }, []);

  // ── B tracing ──────────────────────────────────────────────────────────────

  const getBPos = useCallback((e) => {
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const rawX = (src.clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (src.clientY - rect.top) * (canvas.height / rect.height);
    // Tracer is on the rotated panel when drawerSide === 'right'.
    const rotated = drawerSide === 'right';
    const x = rotated ? canvas.width - rawX : rawX;
    const y = rotated ? canvas.height - rawY : rawY;
    return {
      x: Math.max(0, Math.min(x, canvas.width - 1)),
      y: Math.max(0, Math.min(y, canvas.height - 1)),
    };
  }, [drawerSide]);

  const getTextSnapPoint = useCallback((pos, radius = 34) => {
    const mask = textMaskRef.current;
    if (!mask) return { ...pos, snapped: false };

    const cx = Math.round(pos.x);
    const cy = Math.round(pos.y);
    let best = null;
    let bestDist = Infinity;
    const r = Math.round(radius);

    for (let yy = Math.max(0, cy - r); yy <= Math.min(mask.H - 1, cy + r); yy += 2) {
      for (let xx = Math.max(0, cx - r); xx <= Math.min(mask.W - 1, cx + r); xx += 2) {
        const alpha = mask.data[((yy * mask.W + xx) * 4) + 3];
        if (alpha < 24) continue;
        const dist = Math.hypot(pos.x - xx, pos.y - yy);
        if (dist < bestDist) {
          best = { x: xx, y: yy };
          bestDist = dist;
        }
      }
    }

    return best ? { ...best, snapped: true } : { ...pos, snapped: false };
  }, []);

  const handleBStart = useCallback((e) => {
    if (phase !== 'trace') return;
    e.preventDefault();
    const pos = getBPos(e);

    if (!usesStrokeGuide) {
      const snap = getTextSnapPoint(pos, 46);
      isBDrawingRef.current = true;
      userPointsRef.current = [{ x: snap.x, y: snap.y }];
      setBHasTraceMarks(true);
      if (dotRef.current) dotRef.current.style.display = 'none';
      return;
    }

    const scaledPath = scaledStrokesRef.current[curStrokeRef.current];
    if (!scaledPath) return;
    const start = getNearestPathPoint(pos, scaledPath, 0, Math.min(18, scaledPath.length - 1));

    if (start && start.dist < 55) {
      isBDrawingRef.current = true;
      checkProgressRef.current = 0;
      userPointsRef.current = [{ x: start.x, y: start.y }];
      if (dotRef.current) dotRef.current.style.display = 'none';
    }
  }, [phase, getBPos, getTextSnapPoint, usesStrokeGuide]);

  const handleBMove = useCallback((e) => {
    if (!isBDrawingRef.current || phase !== 'trace') return;
    e.preventDefault();
    const pos = getBPos(e);

    if (!usesStrokeGuide) {
      const snap = getTextSnapPoint(pos);
      userPointsRef.current.push({ x: snap.x, y: snap.y });
      renderUserStroke();
      return;
    }

    const scaledPath = scaledStrokesRef.current[curStrokeRef.current];
    if (!scaledPath) return;
    const nearest = getNearestPathPoint(
      pos,
      scaledPath,
      checkProgressRef.current,
      Math.min(checkProgressRef.current + 28, scaledPath.length - 1)
    );
    if (nearest && nearest.dist < 70) {
      checkProgressRef.current = Math.max(checkProgressRef.current, nearest.index);
      userPointsRef.current.push({ x: nearest.x, y: nearest.y });
    } else {
      userPointsRef.current.push({ x: pos.x, y: pos.y });
    }
    renderUserStroke();
  }, [phase, getBPos, getTextSnapPoint, renderUserStroke, usesStrokeGuide]);

  const handleBEnd = useCallback(() => {
    if (!isBDrawingRef.current) return;
    isBDrawingRef.current = false;

    if (!usesStrokeGuide) {
      const pts = userPointsRef.current;
      const fCanvas = finalCanvasRef.current;
      const dCanvas = drawCanvasRef.current;
      if (fCanvas && pts.length) {
        const fCtx = fCanvas.getContext('2d');
        fCtx.beginPath();
        fCtx.strokeStyle = '#0EA5A0';
        fCtx.lineWidth = 22;
        fCtx.lineCap = 'round';
        fCtx.lineJoin = 'round';
        fCtx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => fCtx.lineTo(p.x, p.y));
        fCtx.stroke();
      }
      if (dCanvas) dCanvas.getContext('2d').clearRect(0, 0, dCanvas.width, dCanvas.height);
      userPointsRef.current = [];
      return;
    }

    const scaledPath = scaledStrokesRef.current[curStrokeRef.current];
    if (!scaledPath) return;

    if (checkProgressRef.current >= scaledPath.length * 0.85) {
      commitStroke();
    } else {
      // Failed — clear draw canvas, show dot again
      const dCanvas = drawCanvasRef.current;
      if (dCanvas) dCanvas.getContext('2d').clearRect(0, 0, dCanvas.width, dCanvas.height);
      userPointsRef.current = [];
      if (dotRef.current) dotRef.current.style.display = 'block';
    }
  }, [commitStroke, usesStrokeGuide]);

  // ── Play again ────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    setWord(prev => {
      if (GAME_WORDS.length <= 1) return prev;
      let next = prev;
      while (next === prev) {
        next = GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)];
      }
      return next;
    });
    setPhase('draw');
    setAHasStrokes(false);
    setBHasTraceMarks(false);
    setDrawingPreview(null);
    aDrawRef.current = { active: false, prev: [0, 0] };
    // Swap drawer/tracer roles each round. The drawerSide effect above
    // re-sizes the new canvas, which also clears it — no manual clear needed.
    setDrawerSide(prev => (prev === 'left' ? 'right' : 'left'));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const drawerUI = (
    <>
      <button
        className="lg-home-btn"
        onClick={() => setAppState('home')}
        title={drawerCopy.homeTitle}
      >⌂</button>

      <div className="lg-header">
        <span className="lg-eyebrow">{drawerCopy.eyebrow}</span>
        {phase === 'draw' && (
          <>
            <h2 className="lg-title">{drawerCopy.drawTitle}</h2>
            <p className="lg-sub">{drawerCopy.drawSub(targetLanguageName)}</p>
          </>
        )}
        {phase === 'trace' && (
          <>
            <h2 className="lg-title">{drawerCopy.traceWaitTitle}</h2>
            <p className="lg-sub">{drawerCopy.traceWaitSub(targetWord.text)}</p>
          </>
        )}
        {phase === 'reveal' && (
          <>
            <h2 className="lg-title">{drawerCopy.taughtTitle}</h2>
            <p className="lg-sub">{drawerCopy.taughtSub(targetLanguageName)}</p>
          </>
        )}
      </div>

      <div className="lg-canvas-wrap">
        <canvas
          ref={aCanvasRef}
          className="lg-canvas"
          onMouseDown={handleAStart}
          onMouseMove={handleAMove}
          onMouseUp={handleAEnd}
          onMouseLeave={handleAEnd}
          onTouchStart={handleAStart}
          onTouchMove={handleAMove}
          onTouchEnd={handleAEnd}
        />
        {phase === 'draw' && (
          <div className="lg-word-hint">
            <span className="lg-hint-label">{drawerCopy.drawThis}</span>
            <span className="lg-hint-emoji">{word.emoji}</span>
            <span className="lg-hint-word" dir={targetIsRTL ? 'rtl' : 'ltr'}>{targetWord.text}</span>
            {targetWord.phonetic && <span className="lg-hint-phonetic">{targetWord.phonetic}</span>}
          </div>
        )}
        {phase !== 'draw' && (
          <div className="lg-word-overlay">
            <span className="lg-overlay-target" dir={targetIsRTL ? 'rtl' : 'ltr'}>{targetWord.text}</span>
            {targetWord.phonetic && <span className="lg-overlay-pinyin">{targetWord.phonetic}</span>}
            <span className="lg-overlay-compare" dir={compareIsRTL ? 'rtl' : 'ltr'}>{compareWord.text}</span>
          </div>
        )}
      </div>

      {phase === 'draw' && (
        <div className="lg-controls">
          <div className="lg-tools">
            <div
              className="lg-swatch"
              style={{ background: aColor }}
              onClick={() => document.getElementById('lg-color-input').click()}
            />
            <input
              id="lg-color-input"
              type="color"
              value={aColor}
              onChange={e => setAColor(e.target.value)}
              className="lg-color-hidden"
            />
            <input
              type="range"
              min="4"
              max="26"
              value={aSize}
              onChange={e => setASize(+e.target.value)}
              className="lg-size-range"
            />
            <span className="lg-size-label">{aSize}</span>
          </div>
          <button
            className={`lg-recog-btn ${!aHasStrokes ? 'lg-disabled' : ''}`}
            onClick={handleFinishDrawing}
            disabled={!aHasStrokes}
          >
            ✓ {drawerCopy.doneDrawing}
          </button>
          <button className="lg-back-btn" onClick={() => setAppState('home')}>
            ← {drawerCopy.back}
          </button>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="lg-reveal-left">
          <span className="rw-target" dir={targetIsRTL ? 'rtl' : 'ltr'}>{targetWord.text}</span>
          {targetWord.phonetic && <span className="rw-phonetic">{targetWord.phonetic}</span>}
          <span className="rw-eq">=</span>
          <span className="rw-compare" dir={compareIsRTL ? 'rtl' : 'ltr'}>{compareWord.text}</span>
        </div>
      )}
    </>
  );

  const tracerUI = (
    <>
      <button
        className="lg-home-btn"
        onClick={() => setAppState('home')}
        title={learnerCopy.homeTitle}
      >⌂</button>

      {phase === 'draw' && (
        <div className="lg-wait">
          <div className="lg-wait-icon">✏️</div>
          <p className="lg-wait-text">{learnerCopy.waitText}</p>
          <p className="lg-wait-sub">{learnerCopy.waitSub}</p>
        </div>
      )}

      {phase === 'trace' && (
        <>
          <div className="lg-header">
            <span className="lg-eyebrow">{learnerCopy.traceEyebrow}</span>
            <h2 className="lg-title">
              {learnerCopy.traceTitle(targetWord.text)}
            </h2>
            <p className="lg-sub">{usesStrokeGuide ? learnerCopy.strokeTraceSub : learnerCopy.textTraceSub}</p>
          </div>

          <div className="lg-trace-area" ref={bAreaRef}>
            <canvas ref={staticCanvasRef} className="lg-guide-canvas" />
            <canvas ref={hintCanvasRef}   className="lg-guide-canvas" />
            <canvas ref={finalCanvasRef}  className="lg-guide-canvas" />
            <canvas
              ref={drawCanvasRef}
              className="lg-trace-canvas"
              onMouseDown={handleBStart}
              onMouseMove={handleBMove}
              onMouseUp={handleBEnd}
              onMouseLeave={handleBEnd}
              onTouchStart={handleBStart}
              onTouchMove={handleBMove}
              onTouchEnd={handleBEnd}
            />
            {drawingPreview && (
              <div className="lg-drawing-preview">
                <img src={drawingPreview} alt="" />
              </div>
            )}
            <div ref={dotRef} className="lg-stroke-dot" style={{ display: 'none' }} />
          </div>

          <p className="lg-trace-hint">
            {usesStrokeGuide ? learnerCopy.strokeTraceHint : learnerCopy.textTraceHint}
          </p>
          {!usesStrokeGuide && (
            <button
              className={`lg-recog-btn ${!bHasTraceMarks ? 'lg-disabled' : ''}`}
              onClick={() => setPhase('reveal')}
              disabled={!bHasTraceMarks}
            >
              ✓ {learnerCopy.doneTracing}
            </button>
          )}
        </>
      )}

      {phase === 'reveal' && (
        <RevealPanel
          word={word}
          targetLang={targetLang}
          learnerLang={learnerLang}
          onPlayAgain={handlePlayAgain}
          pan={learnerPan}
        />
      )}
    </>
  );

  return (
    <div className="lg-screen">

      {/* LEFT half: rotated 180° for the far-side traveler */}
      <div className="lg-half">
        <div className="lg-inner lg-inner-rotated">
          {drawerSide === 'left' ? drawerUI : tracerUI}
        </div>
      </div>

      {/* CENTER DIVIDER */}
      <div className="lg-divider">
        <div className="lg-divider-line" />
      </div>

      {/* RIGHT half: normal orientation for the near-side traveler */}
      <div className="lg-half">
        <div className="lg-inner">
          {drawerSide === 'right' ? drawerUI : tracerUI}
        </div>
      </div>

    </div>
  );
};

export default LanguageGameScreen;
