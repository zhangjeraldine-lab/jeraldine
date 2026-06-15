import React from 'react';
import { useAppStore } from '@/store';
import HomeScreen from '@/components/HomeScreen';
import SplitLanguageScreen from '@/components/SplitLanguageScreen';
import DrawingCanvas from '@/components/DrawingCanvas';
import LanguageGameScreen from '@/components/LanguageGameScreen';
import VoiceCoach from '@/components/VoiceCoach';
import InterpreterButton from '@/components/InterpreterButton';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import '@/styles/App.css';

export const App = () => {
  useImmersiveMode();
  const { appState } = useAppStore();

  return (
    <div className="app">
      {appState === 'home' && <HomeScreen />}
      {appState === 'selecting' && <SplitLanguageScreen />}
      {appState === 'drawing' && <DrawingCanvas />}
      {appState === 'solo-drawing' && <DrawingCanvas mode="solo" />}
      {appState === 'language-game' && <LanguageGameScreen />}
      <VoiceCoach />
      <InterpreterButton />
    </div>
  );
};

export default App;
