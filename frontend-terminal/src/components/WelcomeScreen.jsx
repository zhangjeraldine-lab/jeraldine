import React, { useEffect } from 'react';
import { useAppStore } from '@/store';
import '../styles/Welcome.css';

export const WelcomeScreen = () => {
  const { setAppState, language, setLanguage } = useAppStore();

  const languages = {
    en: { name: 'English', flag: '🇬🇧' },
    zh: { name: '中文', flag: '🇨🇳' },
    ja: { name: '日本語', flag: '🇯🇵' },
    ko: { name: '한국어', flag: '🇰🇷' },
    es: { name: 'Español', flag: '🇪🇸' },
    fr: { name: 'Français', flag: '🇫🇷' },
    de: { name: 'Deutsch', flag: '🇩🇪' },
    it: { name: 'Italiano', flag: '🇮🇹' },
  };

  useEffect(() => {
    // 检测用户浏览器语言
    const browserLang = navigator.language.split('-')[0];
    if (languages[browserLang]) {
      setLanguage(browserLang);
    }
  }, [setLanguage]);

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="title">🎨 共绘连接</h1>
        <p className="subtitle">Co-Drawing Connections</p>
        <p className="description">
          与陌生的旅客协作绘画，创造跨越文化边界的艺术作品
        </p>

        <div className="language-selector">
          <p className="language-title">选择语言 / Select Language</p>
          <div className="language-grid">
            {Object.entries(languages).map(([code, { name, flag }]) => (
              <button
                key={code}
                className={`language-btn ${language === code ? 'active' : ''}`}
                onClick={() => setLanguage(code)}
              >
                <span className="flag">{flag}</span>
                <span className="lang-name">{name}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="start-btn"
          onClick={() => setAppState('enter')}
        >
          开始体验 / Start →
        </button>

        <div className="info-box">
          <p>🎯 在候机区找到另一位旅客</p>
          <p>🎨 15分钟内共同创作数字艺术</p>
          <p>📱 扫码分享，永远保存回忆</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
