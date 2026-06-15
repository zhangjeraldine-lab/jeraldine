import React from 'react';
import { useAppStore } from '@/store';
import { isRTL, normalizeLang } from '@/utils/language';
import '../styles/HomeScreen.css';

const HOME_COPY = {
  zh: {
    eyebrow: 'Layover · 共绘连接',
    title: '一起做点什么？',
    subtitle: '一起选择一个活动',
    drawing: '共创绘画',
    drawingMeta: '共享画布',
    drawingDesc: '两人共同在同一块画布上创作',
    solo: '单人绘画',
    soloMeta: 'Solo drawing',
    soloDesc: '一个人使用整块画布自由创作',
    language: '语言交换',
    languageMeta: '语言游戏',
    languageDesc: '画一个词，教对方用你的语言读',
    or: '或',
  },
  en: {
    eyebrow: 'Layover · Gemeinsames Zeichnen',
    title: 'What shall we do together?',
    subtitle: 'Choose an activity together',
    drawing: 'Gemeinsam zeichnen',
    drawingMeta: 'Shared canvas',
    drawingDesc: 'Create together on one mirrored canvas',
    solo: 'Solo Drawing',
    soloMeta: 'Personal canvas',
    soloDesc: 'Draw freely on the full screen by yourself',
    language: 'Language Game',
    languageMeta: 'Language exchange',
    languageDesc: 'Draw a word and teach your partner how to say it',
    or: 'or',
  },
  ja: {
    eyebrow: 'Layover · 共描きコネクション',
    title: '一緒に何をしますか？',
    subtitle: 'アクティビティを一緒に選びます',
    drawing: '共創ドローイング',
    drawingMeta: '共同キャンバス',
    drawingDesc: '一つのミラーキャンバスで一緒に描きます',
    language: '言語ゲーム',
    languageMeta: '言語交換',
    languageDesc: '言葉を描いて、相手に発音を教えます',
    or: 'または',
  },
  ko: {
    eyebrow: 'Layover · 공동 그림 연결',
    title: '함께 무엇을 할까요?',
    subtitle: '함께 활동을 선택하세요',
    drawing: '공동 그림 그리기',
    drawingMeta: '공유 캔버스',
    drawingDesc: '하나의 거울 캔버스에서 함께 창작합니다',
    language: '언어 게임',
    languageMeta: '언어 교환',
    languageDesc: '단어를 그리고 상대에게 발음을 알려 주세요',
    or: '또는',
  },
  es: {
    eyebrow: 'Layover · Conexión de dibujo',
    title: '¿Qué hacemos juntos?',
    subtitle: 'Elijan una actividad juntos',
    drawing: 'Dibujo compartido',
    drawingMeta: 'Lienzo compartido',
    drawingDesc: 'Creen juntos en un lienzo reflejado',
    language: 'Juego de idioma',
    languageMeta: 'Intercambio de idiomas',
    languageDesc: 'Dibuja una palabra y enseña a tu compañero a decirla',
    or: 'o',
  },
  fr: {
    eyebrow: 'Layover · Dessin partagé',
    title: 'Que faisons-nous ensemble ?',
    subtitle: 'Choisissez une activité ensemble',
    drawing: 'Dessin partagé',
    drawingMeta: 'Toile commune',
    drawingDesc: 'Créez ensemble sur une toile miroir',
    language: 'Jeu de langue',
    languageMeta: 'Échange linguistique',
    languageDesc: 'Dessinez un mot et apprenez sa prononciation à votre partenaire',
    or: 'ou',
  },
  de: {
    eyebrow: 'Layover · Co-Drawing Connections',
    title: 'Was machen wir zusammen?',
    subtitle: 'Wählt gemeinsam eine Aktivität',
    drawing: 'Co-Drawing',
    drawingMeta: 'Gemeinsame Leinwand',
    drawingDesc: 'Gestaltet zusammen auf einer gespiegelten Leinwand',
    language: 'Sprachspiel',
    languageMeta: 'Sprachaustausch',
    languageDesc: 'Zeichne ein Wort und bringe deinem Partner die Aussprache bei',
    or: 'oder',
  },
  ar: {
    eyebrow: 'Layover · اتصال الرسم المشترك',
    title: 'ماذا سنفعل معا؟',
    subtitle: 'اختارا نشاطا معا',
    drawing: 'الرسم المشترك',
    drawingMeta: 'لوحة مشتركة',
    drawingDesc: 'أنشئا معا على لوحة منعكسة واحدة',
    language: 'لعبة اللغة',
    languageMeta: 'تبادل لغوي',
    languageDesc: 'ارسم كلمة وعلّم شريكك طريقة نطقها',
    or: 'أو',
  },
};

const getCopy = (lang) => HOME_COPY[normalizeLang(lang)] || HOME_COPY.en;
const getField = (copy, field) => copy[field] || HOME_COPY.en[field];

export const HomeScreen = () => {
  const { setAppState, setGameMode, leftLanguage, rightLanguage } = useAppStore();

  const choose = (mode) => {
    setGameMode(mode);
    if (mode === 'language') setAppState('language-game');
    else if (mode === 'solo') setAppState('solo-drawing');
    else setAppState('drawing');
  };

  const Menu = ({ rotated = false, lang = 'en' }) => {
    const copy = getCopy(lang);

    return (
      <div
        className={`home-inner ${rotated ? 'home-inner-rotated' : ''}`}
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
        lang={lang}
      >
        <section className="home-hero-block">
          <div className="home-eyebrow">{copy.eyebrow}</div>
          <h1 className="home-title">{copy.title}</h1>
          <p className="home-sub">{copy.subtitle}</p>
        </section>

        <div className="home-cards">
          <button className="home-card" onClick={() => choose('drawing')}>
            <span className="home-card-top">
              <span className="home-card-icon">
                <img className="home-card-icon-img" src="/drawing.svg" alt="" aria-hidden="true" />
              </span>
              <span className="home-card-arrow">↗</span>
            </span>
            <span className="home-card-zh">{copy.drawing}</span>
            <span className="home-card-en">{copy.drawingMeta}</span>
            <span className="home-card-desc">{copy.drawingDesc}</span>
          </button>

          <div className="home-separator">
            <span>{copy.or}</span>
          </div>

          <button className="home-card" onClick={() => choose('solo')}>
            <span className="home-card-top">
              <span className="home-card-icon">
                <img className="home-card-icon-img" src="/solo.svg" alt="" aria-hidden="true" />
              </span>
              <span className="home-card-arrow">↗</span>
            </span>
            <span className="home-card-zh">{getField(copy, 'solo')}</span>
            <span className="home-card-en">{getField(copy, 'soloMeta')}</span>
            <span className="home-card-desc">{getField(copy, 'soloDesc')}</span>
          </button>

          <div className="home-separator">
            <span>{copy.or}</span>
          </div>

          <button className="home-card" onClick={() => choose('language')}>
            <span className="home-card-top">
              <span className="home-card-icon">
                <img className="home-card-icon-img" src="/language.svg" alt="" aria-hidden="true" />
              </span>
              <span className="home-card-arrow">↗</span>
            </span>
            <span className="home-card-zh">{copy.language}</span>
            <span className="home-card-en">{copy.languageMeta}</span>
            <span className="home-card-desc">{copy.languageDesc}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="home-screen">
      <div className="home-panel">
        <Menu rotated lang={leftLanguage || 'en'} />
      </div>

      <div className="home-center">
        <div className="home-center-line" />
      </div>

      <div className="home-panel">
        <Menu lang={rightLanguage || 'en'} />
      </div>
    </div>
  );
};

export default HomeScreen;
