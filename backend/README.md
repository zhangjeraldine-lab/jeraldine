# 共绘连接 - 后端服务

Node.js + Express + Socket.io 实时协作绘画API服务

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

服务器将在 `http://localhost:3001` 启动

### 启动生产服务器
```bash
npm start
```

## API 端点

### 健康检查
- `GET /api/health` - 服务器状态检查

### 队列管理
- `GET /api/queue/stats` - 获取等待队列统计
- `POST /api/matching/check` - 检查并进行自动配对

### 会话管理
- `GET /api/session/:sessionId` - 获取会话信息

### 主题和语言
- `GET /api/themes` - 获取所有可用主题
- `GET /api/languages` - 获取所有支持语言

### 作品管理
- `POST /api/artwork/save` - 保存作品（Phase 3）

## WebSocket 事件

### 客户端 → 服务器

| 事件 | 数据 | 说明 |
|------|------|------|
| `enter` | `{userId, language, country}` | 用户进入 |
| `stroke` | `{sessionId, userId, stroke}` | 发送笔触 |
| `selectTheme` | `{sessionId, userId, theme}` | 选择主题 |
| `undo` | `{sessionId}` | 撤销操作 |
| `clear` | `{sessionId}` | 清空画布 |
| `finishDrawing` | `{sessionId, userId, finalImage}` | 完成绘画 |
| `getStats` | - | 获取统计信息 |

### 服务器 → 客户端

| 事件 | 数据 | 说明 |
|------|------|------|
| `matched` | `{sessionId, opponentLanguage, role}` | 配对成功 |
| `strokeBatch` | `{strokes, batchSize}` | 批量笔触数据 |
| `themeSelected` | `{theme, selectedBy}` | 主题已选择 |
| `undoAction` | `{timestamp}` | 撤销确认 |
| `clearCanvas` | `{timestamp}` | 清空画布确认 |
| `drawingCompleted` | `{completedBy, timestamp}` | 绘画已完成 |
| `opponentDisconnected` | `{sessionId}` | 对方已断开连接 |
| `queueUpdated` | `{waitingCount}` | 队列更新 |
| `queueStats` | `{waitingCount, activeSessions}` | 队列统计 |

## 环境变量

参考 `.env.example` 文件配置以下变量：

```
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/app.db
AI_SERVICE_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
OPENAI_RECOGNITION_MODEL=gpt-5.5
OPENAI_GENERATION_MODEL=gpt-5.5
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_SIZE=1024x1024
```

### AI 识别与生图

- `POST /api/recognize` - 识别当前手绘图，返回 `中文/English` 标签
- `POST /api/generate-styles` - 基于当前手绘图生成多张保留手绘感的 AI 风格候选图
- `GET /api/ai/styles` - 获取可生成的候选风格

## 数据库

使用 SQLite 作为本地数据库，自动创建以下表：

- `users` - 用户账户（可选）
- `sessions` - 配对会话
- `strokes` - 笔触数据
- `artworks` - 完成作品
- `gallery` - 作品库
- `qr_mappings` - 二维码映射

## 架构

```
Express Server
├── REST API
├── WebSocket Manager
│   ├── 用户连接管理
│   ├── 实时笔触同步
│   └── 事件广播
├── Matching Service
│   ├── 用户队列管理
│   └── 配对算法
└── Database
    └── SQLite
```

## 性能指标（目标）

- ✓ WebSocket 延迟: < 50ms
- ✓ 笔触批处理: 每 50ms 发送一次
- ✓ 单实例支持: 1000+ 并发连接
- ✓ 数据库查询: < 10ms

## 调试

启用调试模式：
```bash
DEBUG=true npm run dev
```

## 部署

### Docker
```bash
docker build -t co-drawing-backend .
docker run -p 3001:3001 co-drawing-backend
```

### 生产环境
使用 PM2：
```bash
npm install -g pm2
pm2 start src/index.js --name "co-drawing-api"
```
