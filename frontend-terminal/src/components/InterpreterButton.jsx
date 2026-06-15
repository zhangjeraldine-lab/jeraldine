import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { InterpreterSession } from '@/utils/interpreter';
import { isRTL, normalizeLang } from '@/utils/language';
import '../styles/Interpreter.css';

const UI_COPY = {
  zh: { hold: '按住说话', listening: '聆听中…', translating: '翻译中…', playing: '正在播放', idle: '同传', error: '连接失败', missingLang: '请先选择两端语言' },
  en: { hold: 'Hold to talk', listening: 'Listening…', translating: 'Translating…', playing: 'Playing', idle: 'Interpret', error: 'Connection failed', missingLang: 'Pick both side languages first' },
  ja: { hold: '長押しで話す', listening: '聞き取り中…', translating: '翻訳中…', playing: '再生中', idle: '同時通訳', error: '接続に失敗', missingLang: '先に両側の言語を選んでください' },
  ko: { hold: '눌러서 말하기', listening: '듣는 중…', translating: '번역 중…', playing: '재생 중', idle: '동시통역', error: '연결 실패', missingLang: '먼저 양쪽 언어를 선택하세요' },
  es: { hold: 'Mantén pulsado para hablar', listening: 'Escuchando…', translating: 'Traduciendo…', playing: 'Reproduciendo', idle: 'Intérprete', error: 'Conexión fallida', missingLang: 'Elige primero los dos idiomas' },
  fr: { hold: 'Maintenir pour parler', listening: 'Écoute…', translating: 'Traduction…', playing: 'Lecture', idle: 'Interprète', error: 'Échec de connexion', missingLang: "Choisissez d'abord les deux langues" },
  de: { hold: 'Zum Sprechen halten', listening: 'Hört zu…', translating: 'Übersetzt…', playing: 'Wiedergabe', idle: 'Dolmetschen', error: 'Verbindung fehlgeschlagen', missingLang: 'Zuerst beide Sprachen wählen' },
  ar: { hold: 'اضغط مع الاستمرار للتحدث', listening: 'جارٍ الاستماع…', translating: 'جارٍ الترجمة…', playing: 'قيد التشغيل', idle: 'الترجمة الفورية', error: 'فشل الاتصال', missingLang: 'اختر لغتي الجانبين أولاً' },
};

const copyFor = (lang) => UI_COPY[normalizeLang(lang)] || UI_COPY.en;

const SidePanel = ({ side, fromLang, toLang, uiLang }) => {
  const sessionRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | connecting | ready | listening | translating | playing | error
  const [sourceText, setSourceText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState(false);
  const holdingRef = useRef(false);

  const copy = copyFor(uiLang);
  const panelIsRTL = isRTL(uiLang);
  const ready = Boolean(fromLang && toLang && fromLang !== toLang);

  const teardown = useCallback(async () => {
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) {
      try { await s.close(); } catch {}
    }
  }, []);

  useEffect(() => () => { teardown(); }, [teardown]);

  // Languages changed mid-session → tear down so next press opens a fresh socket.
  useEffect(() => {
    teardown();
    setStatus('idle');
    setSourceText('');
    setTranslationText('');
    setErrorMsg('');
  }, [fromLang, toLang, teardown]);

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    const session = new InterpreterSession({
      from: fromLang,
      to: toLang,
      // Pan playback to the OPPOSITE side's ear so the listener hears it.
      pan: side === 'left' ? 1 : -1,
      onSource: (text) => setSourceText(text),
      onTranslation: (text) => setTranslationText(text),
      onStatus: (s) => setStatus(s),
      onError: (msg) => { setStatus('error'); setErrorMsg(msg); },
    });
    sessionRef.current = session;
    try {
      await session.open();
    } catch (err) {
      sessionRef.current = null;
      setStatus('error');
      setErrorMsg(err?.message || 'connect failed');
      throw err;
    }
    return session;
  }, [fromLang, toLang, side]);

  const onPressDown = useCallback(async (ev) => {
    ev.preventDefault();
    if (!ready || holdingRef.current) return;
    holdingRef.current = true;
    setExpanded(true);
    setErrorMsg('');
    try {
      const session = await ensureSession();
      await session.startCapture();
    } catch (err) {
      holdingRef.current = false;
      setErrorMsg(err?.message || 'mic failed');
      setStatus('error');
    }
  }, [ready, ensureSession]);

  const onPressUp = useCallback(async (ev) => {
    ev?.preventDefault?.();
    if (!holdingRef.current) return;
    holdingRef.current = false;
    const session = sessionRef.current;
    if (!session) return;
    try { await session.stopCapture(); }
    catch (err) { setErrorMsg(err?.message || 'stop failed'); }
  }, []);

  const onCancel = useCallback(() => {
    holdingRef.current = false;
    sessionRef.current?.cancel();
    setExpanded(false);
  }, []);

  const statusText = useMemo(() => {
    if (!ready) return copy.missingLang;
    if (status === 'error') return errorMsg || copy.error;
    if (status === 'listening') return copy.listening;
    if (status === 'translating') return copy.translating;
    if (status === 'playing') return copy.playing;
    if (status === 'connecting') return '…';
    return copy.hold;
  }, [ready, status, copy, errorMsg]);

  const fabClass = [
    'interpret-fab',
    `interpret-fab-${side}`,
    holdingRef.current ? 'is-listening' : '',
    status === 'playing' ? 'is-playing' : '',
    status === 'translating' ? 'is-translating' : '',
    status === 'error' ? 'is-error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`interpret-overlay interpret-overlay-${side}`}>
      {expanded && (
        <div className={`interpret-panel interpret-panel-${side}`}
             dir={panelIsRTL ? 'rtl' : 'ltr'}>
          <div className="interpret-panel-head">
            <span className="interpret-langs">
              {(fromLang || '?').toUpperCase()} → {(toLang || '?').toUpperCase()}
            </span>
            <button className="interpret-close" onClick={() => { onCancel(); setExpanded(false); }}>
              ×
            </button>
          </div>
          {sourceText && (
            <div className="interpret-line interpret-line-source">{sourceText}</div>
          )}
          {translationText && (
            <div className="interpret-line interpret-line-translation">{translationText}</div>
          )}
          <div className="interpret-status">{statusText}</div>
        </div>
      )}

      <button
        className={fabClass}
        type="button"
        disabled={!ready}
        title={ready ? copy.hold : copy.missingLang}
        onPointerDown={onPressDown}
        onPointerUp={onPressUp}
        onPointerLeave={onPressUp}
        onPointerCancel={onPressUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="interpret-fab-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        </span>
        <span className="interpret-fab-label">
          {status === 'listening' ? copy.listening : copy.idle}
        </span>
      </button>
    </div>
  );
};

const InterpreterButton = () => {
  const leftLanguage = useAppStore((s) => s.leftLanguage);
  const rightLanguage = useAppStore((s) => s.rightLanguage);
  const appState = useAppStore((s) => s.appState);
  const isSolo = appState === 'solo-drawing';

  return (
    <>
      {!isSolo && (
        <SidePanel
          side="left"
          fromLang={leftLanguage}
          toLang={rightLanguage}
          uiLang={leftLanguage || 'en'}
        />
      )}
      <SidePanel
        side="right"
        fromLang={rightLanguage}
        toLang={leftLanguage}
        uiLang={rightLanguage || 'en'}
      />
    </>
  );
};

export default InterpreterButton;
