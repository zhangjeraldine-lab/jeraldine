import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { isRTL, normalizeLang, SUPPORTED_LANGUAGES } from '@/utils/language';
import '../styles/SplitLanguage.css';

const SELECT_COPY = {
  zh: { main: '选择你的语言', sub: '请选择面前界面的语言', waiting: '已准备 · 等待另一位旅客' },
  en: { main: 'Select Your Language', sub: 'Choose the language for your side', waiting: 'Ready · Waiting for the other traveler' },
  ja: { main: '言語を選択', sub: 'この画面で使う言語を選んでください', waiting: '準備完了 · 相手を待っています' },
  ko: { main: '언어 선택', sub: '이쪽 화면의 언어를 선택하세요', waiting: '준비됨 · 상대를 기다리는 중' },
  es: { main: 'Elige tu idioma', sub: 'Elige el idioma de tu lado', waiting: 'Listo · Esperando al otro viajero' },
  fr: { main: 'Choisissez votre langue', sub: 'Choisissez la langue de votre côté', waiting: "Prêt · En attente de l'autre voyageur" },
  de: { main: 'Sprache wählen', sub: 'Wähle die Sprache für deine Seite', waiting: 'Bereit · Wartet auf die andere Person' },
  ar: { main: 'اختر لغتك', sub: 'اختر لغة جهتك من الشاشة', waiting: 'جاهز · في انتظار المسافر الآخر' },
};

const getSelectCopy = (lang) => SELECT_COPY[normalizeLang(lang)] || SELECT_COPY.en;

const LangList = ({ selected, onSelect }) =>
  SUPPORTED_LANGUAGES.map(({ code, name, flag }) => (
    <button
      key={code}
      className={`lang-btn ${selected === code ? 'active' : ''}`}
      onClick={() => onSelect(code)}
    >
      <span className="lang-flag">{flag}</span>
      <span className="lang-name">{name}</span>
      {selected === code && <span className="lang-check">✓</span>}
    </button>
  ));

export const SplitLanguageScreen = () => {
  const { setAppState, setLeftLanguage, setRightLanguage } = useAppStore();
  const [leftLang, setLeftLang] = useState(null);
  const [rightLang, setRightLang] = useState(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (leftLang && rightLang) {
      setLeftLanguage(leftLang);
      setRightLanguage(rightLang);
      setOpening(true);
      setTimeout(() => setAppState('home'), 900);
    }
  }, [leftLang, rightLang, setLeftLanguage, setRightLanguage, setAppState]);

  const leftCopy = leftLang ? getSelectCopy(leftLang) : null;
  const rightCopy = rightLang ? getSelectCopy(rightLang) : null;

  return (
    <div className={`split-screen ${opening ? 'opening' : ''}`}>

      {/* 左半：旋转180°，供对面的人读（他们右手在屏幕左侧） */}
      <div className={`split-panel left-panel ${leftLang ? 'confirmed' : ''}`}>
        <div
          className="panel-inner rotated"
          dir={leftLang && isRTL(leftLang) ? 'rtl' : 'ltr'}
          lang={leftLang || undefined}
        >
          <span className="panel-eyebrow">layover · shared terminal</span>
          <div className="panel-prompt">
            <span className="prompt-main">{leftCopy?.main || 'Select Your Language'}</span>
            <span className="prompt-sub">{leftCopy?.sub || 'Choose your language'}</span>
          </div>
          <div className="language-list">
            <LangList selected={leftLang} onSelect={setLeftLang} />
          </div>
          {leftLang && <div className="waiting-hint">{leftCopy.waiting}</div>}
        </div>
      </div>

      {/* 中间分割线 */}
      <div className="split-center">
        <div className="center-line" />
      </div>

      {/* 右半：正常方向，供正对屏幕的人使用（右手在屏幕右侧） */}
      <div className={`split-panel right-panel ${rightLang ? 'confirmed' : ''}`}>
        <div
          className="panel-inner"
          dir={rightLang && isRTL(rightLang) ? 'rtl' : 'ltr'}
          lang={rightLang || undefined}
        >
          <span className="panel-eyebrow">layover · shared terminal</span>
          <div className="panel-prompt">
            <span className="prompt-main">{rightCopy?.main || 'Select Your Language'}</span>
            <span className="prompt-sub">{rightCopy?.sub || 'Choose your language'}</span>
          </div>
          <div className="language-list">
            <LangList selected={rightLang} onSelect={setRightLang} />
          </div>
          {rightLang && <div className="waiting-hint">{rightCopy.waiting}</div>}
        </div>
      </div>

    </div>
  );
};

export default SplitLanguageScreen;
