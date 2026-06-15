export default {
  // 服务器配置
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // AI服务配置
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_STROKE_RECOGNITION: '/api/stroke/recognize',
  AI_SHAPE_COMPLETION: '/api/stroke/complete',
  AI_STYLE_TRANSFER: '/api/art/stylize',

  // 数据库配置
  DATABASE_PATH: process.env.DATABASE_PATH || './data/app.db',

  // WebSocket配置
  WEBSOCKET: {
    STROKE_BATCH_SIZE: 10,
    BATCH_INTERVAL_MS: 50,
    RECONNECT_TIMEOUT: 5000,
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30分钟
  },

  // 用户配对配置
  MATCHING: {
    WAIT_TIMEOUT: 5 * 60 * 1000, // 5分钟自动配对
    INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15分钟无操作断开
  },

  // 绘画配置
  DRAWING: {
    MAX_CANVAS_WIDTH: 3840,
    MAX_CANVAS_HEIGHT: 2160,
    MAX_COLORS: 256,
  },

  // 多语言配置
  LANGUAGES: [
    'en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru',
    'ar', 'hi', 'th', 'vi', 'id', 'ms', 'pl', 'nl', 'sv', 'tr'
  ],
  DEFAULT_LANGUAGE: 'en',

  // 作品配置
  ARTWORK: {
    EXPORT_QUALITY: 0.95,
    THUMBNAIL_SIZE: 400,
    STORAGE_PATH: './data/artworks',
  },

  // 调试配置
  DEBUG: process.env.DEBUG === 'true',
};
