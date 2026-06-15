import { useEffect } from 'react';

const requestFullscreen = async () => {
  const el = document.documentElement;
  if (document.fullscreenElement) return;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    // Fullscreen can be rejected in normal Chrome tabs; PWA/kiosk still uses the manifest.
  }
};

export const useImmersiveMode = () => {
  useEffect(() => {
    const enter = () => {
      requestFullscreen();
      window.scrollTo(0, 1);
    };

    window.addEventListener('pointerdown', enter, { once: true, passive: true });
    window.addEventListener('keydown', enter, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enter);
      window.removeEventListener('keydown', enter);
    };
  }, []);
};
