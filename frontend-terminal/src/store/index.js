import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const useAppStore = create((set) => ({
  // 用户状态
  userId: uuidv4(),
  language: 'en',
  country: null,
  setLanguage: (language) => set({ language }),
  setCountry: (country) => set({ country }),

  // 双屏语言
  leftLanguage: null,
  rightLanguage: null,
  setLeftLanguage: (lang) => set({ leftLanguage: lang, language: lang }),
  setRightLanguage: (lang) => set({ rightLanguage: lang }),

  // 应用状态
  appState: 'selecting', // selecting -> home -> drawing | solo-drawing | language-game
  setAppState: (appState) => set({ appState }),

  // 游戏模式
  gameMode: null, // 'drawing' | 'solo' | 'language'
  setGameMode: (gameMode) => set({ gameMode }),

  // 配对状态
  sessionId: null,
  opponentLanguage: null,
  role: null, // 'A' or 'B'
  setSession: (sessionId, opponentLanguage, role) =>
    set({ sessionId, opponentLanguage, role }),
  clearSession: () => set({ sessionId: null, opponentLanguage: null, role: null }),

  // 绘画状态
  theme: null,
  setTheme: (theme) => set({ theme }),
  strokes: [],
  addStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),
  clearStrokes: () => set({ strokes: [] }),

  // 画廊状态
  artworks: [],
  addArtwork: (artwork) =>
    set((state) => ({ artworks: [...state.artworks, artwork] })),

  // UI状态
  isMobileView: window.innerWidth < 1080,
  showThemeSelector: false,
  setShowThemeSelector: (show) => set({ showThemeSelector: show }),

  // 队列统计
  queueStats: { waitingCount: 0, activeSessions: 0 },
  setQueueStats: (stats) => set({ queueStats: stats }),
}));

export const useDrawingStore = create((set) => ({
  // 画布状态
  canvasRef: null,
  contextRef: null,
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  setContextRef: (ref) => set({ contextRef: ref }),

  // 绘画工具
  currentTool: 'pen', // pen, eraser, colorpicker
  setCurrentTool: (tool) => set({ currentTool: tool }),

  // 颜色和样式
  currentColor: '#ffffff',
  setCurrentColor: (color) => set({ currentColor: color }),
  penSize: 3,
  setPenSize: (size) => set({ penSize: size }),

  // 绘画状态
  isDrawing: false,
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  // 笔触历史（用于撤销）
  strokeHistory: [],
  addToHistory: (stroke) =>
    set((state) => ({ strokeHistory: [...state.strokeHistory, stroke] })),
  undoStroke: () =>
    set((state) => ({
      strokeHistory: state.strokeHistory.slice(0, -1),
    })),
  clearHistory: () => set({ strokeHistory: [] }),

  // 对方的笔触
  opponentStrokes: [],
  addOpponentStroke: (stroke) =>
    set((state) => ({ opponentStrokes: [...state.opponentStrokes, stroke] })),
  clearOpponentStrokes: () => set({ opponentStrokes: [] }),
}));

export default useAppStore;
