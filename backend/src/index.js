import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.js';
import dbManager from './database.js';
import MatchingService from './services/matching.js';
import WebSocketManager from './websocket/manager.js';
import registerDrawingShareRoutes from './routes/drawingShareRoutes.js';
import registerOpenAIArtRoutes from './routes/openaiArtRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 初始化Express应用
const app = express();
const server = http.createServer(app);

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制100个请求
});
app.use(limiter);

// 初始化数据库
const db = dbManager.initialize();

// 初始化服务
const matchingService = new MatchingService(db);
const wsManager = new WebSocketManager(server, matchingService, db);

// ===== API 路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

registerOpenAIArtRoutes(app);
registerDrawingShareRoutes(app, {
  port: config.PORT,
  mobileAppDir: path.join(__dirname, '../../mobile-app'),
  storageDir: path.join(__dirname, '../../data/drawings'),
});

// 获取队列统计
app.get('/api/queue/stats', (req, res) => {
  const stats = matchingService.getQueueStats();
  res.json(stats);
});

// 获取会话信息
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = matchingService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }

  res.json(session);
});

// 获取主题列表
app.get('/api/themes', (req, res) => {
  const themes = [
    { id: 'animal', name: 'Animals', icon: '🐾' },
    { id: 'plant', name: 'Plants', icon: '🌿' },
    { id: 'food', name: 'Food', icon: '🍕' },
    { id: 'vehicle', name: 'Vehicles', icon: '🚗' },
    { id: 'building', name: 'Buildings', icon: '🏢' },
    { id: 'nature', name: 'Nature', icon: '🏞️' },
    { id: 'emotion', name: 'Emotions', icon: '😊' },
    { id: 'abstract', name: 'Abstract', icon: '✨' },
    { id: 'space', name: 'Space', icon: '🚀' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'fantasy', name: 'Fantasy', icon: '🧙' },
    { id: 'tech', name: 'Technology', icon: '💻' },
  ];

  res.json(themes);
});

// 获取语言列表
app.get('/api/languages', (req, res) => {
  const languages = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ru: 'Русский',
    ar: 'العربية',
    hi: 'हिन्दी',
    th: 'ไทย',
    vi: 'Tiếng Việt',
    id: 'Bahasa Indonesia',
    ms: 'Bahasa Melayu',
    pl: 'Polski',
    nl: 'Nederlands',
    sv: 'Svenska',
    tr: 'Türkçe',
  };

  res.json(languages);
});

// 自动配对检查（定期调用）
app.post('/api/matching/check', (req, res) => {
  const match = matchingService.autoMatchCheck();

  if (match) {
    res.json({ matched: true, match });
  } else {
    res.json({ matched: false });
  }
});

// 作品上传/保存 (占位符，Phase 3实现)
app.post('/api/artwork/save', (req, res) => {
  const { sessionId, imageData, metadata } = req.body;

  // TODO: 实现作品保存逻辑
  res.json({
    status: 'pending',
    message: 'Artwork saving feature coming in Phase 3',
    artworkId: 'artwork-' + Date.now(),
  });
});

// 静态文件（如需）
app.use(express.static(path.join(__dirname, '../public')));

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.DEBUG ? err.message : undefined,
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ===== 定期任务 =====

// 每30秒检查一次自动配对
setInterval(() => {
  const match = matchingService.autoMatchCheck();
  if (match) {
    const wsIO = wsManager.getIO();
    wsIO.to(match.sessionId).emit('matched', {
      sessionId: match.sessionId,
    });
  }

  // 广播队列统计
  wsManager.broadcastQueueStats();
}, 30000);

// 启动服务器
const PORT = config.PORT;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🎨 共绘连接 (Co-Drawing Connections) 🎨           ║
║                                                            ║
║  Backend Server Running                                   ║
║  🚀 URL: http://localhost:${PORT}                          ║
║  🌐 WebSocket: ws://localhost:${PORT}                      ║
║  📊 Database: ${config.DATABASE_PATH}                     ║
║  🔧 Mode: ${config.NODE_ENV}                               ║
║  🤖 AI Service: ${config.AI_SERVICE_URL}                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📛 收到SIGTERM信号，开始关闭...');
  server.close(() => {
    console.log('🛑 服务器已关闭');
    dbManager.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⛔ 收到SIGINT信号，开始关闭...');
  server.close(() => {
    console.log('🛑 服务器已关闭');
    dbManager.close();
    process.exit(0);
  });
});

export { app, server, wsManager };
