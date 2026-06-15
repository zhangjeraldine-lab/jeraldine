# 共绘连接 - 前端应用

React 18 + Vite + Canvas API 实时协作绘画大屏应用

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 生产构建
```bash
npm run build
```

构建输出在 `dist/` 目录

## 项目结构

```
src/
├── components/          # React 组件
│   ├── WelcomeScreen.jsx    # 欢迎屏幕
│   ├── MatchingScreen.jsx   # 配对屏幕
│   ├── DrawingCanvas.jsx    # 绘画画布
│   └── GalleryScreen.jsx    # 作品画廊
├── hooks/              # React Hooks
│   └── useWebSocket.jsx     # WebSocket 连接
├── store/              # 状态管理 (Zustand)
│   └── index.js            # 应用状态定义
├── styles/             # CSS 样式
├── utils/              # 工具函数
├── App.jsx             # 主应用组件
└── main.jsx            # 入口文件
```

## 应用流程

1. **欢迎屏幕** (`welcome`)
   - 语言选择
   - 了解项目信息
   - 点击开始

2. **配对屏幕** (`enter`)
   - 连接 WebSocket
   - 进入等待队列
   - 等待用户配对

3. **绘画屏幕** (`drawing`)
   - 实时双人协作
   - Canvas 绘画
   - 主题选择
   - AI 增强功能

4. **完成屏幕** (`completed`)
   - 作品预览
   - 生成二维码
   - 分享选项

5. **画廊屏幕** (`gallery`)
   - 浏览所有作品
   - 查看创作过程
   - 二次创作

## 核心功能

### Canvas 绘画
- 支持压感笔输入
- 笔刷、橡皮、颜色工具
- 撤销/重做功能
- 高分辨率 (4K) 导出

### 实时同步
- WebSocket 低延迟通信 (<100ms)
- 笔触批处理（每 50ms）
- 对方笔触实时显示

### 多语言支持
- 自动检测浏览器语言
- 支持 20+ 语言
- 动态语言切换

### AI 增强
- 线条识别和补全建议
- 艺术风格转化
- 智能绘画引导

## 环境配置

创建 `.env.local` 文件：
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_DEBUG=true
```

## 状态管理

使用 Zustand 进行状态管理：

### useAppStore
- `userId` - 用户唯一ID
- `appState` - 应用当前状态
- `sessionId` - 会话ID
- `language` - 用户语言

### useDrawingStore
- `canvasRef` - Canvas DOM 引用
- `currentColor` - 当前颜色
- `penSize` - 笔刷大小
- `strokes` - 本地笔触历史
- `opponentStrokes` - 对方笔触

## 关键 Hook

### useWebSocket
连接和管理 WebSocket：
```javascript
const { socket, emit, on, isConnected } = useWebSocket();

emit('stroke', { sessionId, userId, stroke });
on('strokeBatch', (data) => { ... });
```

## 样式系统

使用 CSS 变量和 Flexbox 布局：

```css
/* 颜色变量 */
--primary: #667eea
--secondary: #764ba2

/* 响应式布局 */
@media (max-width: 1080px) {
  /* 移动设备样式 */
}
```

## 性能优化

- ✓ Canvas 绘画优化（批处理）
- ✓ 图像压缩和缓存
- ✓ WebSocket 消息压缩
- ✓ 组件懒加载
- ✓ 虚拟滚动（画廊）

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

支持：
- WebSocket
- Canvas API
- Pointer Events
- Web Workers

## 开发工具

### VS Code 扩展推荐
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- Vite
- Thunder Client (API 测试)

### 调试

启用开发模式下的调试信息：
```
http://localhost:5173?debug=true
```

## 部署

### Docker
```bash
docker build -t co-drawing-frontend .
docker run -p 3000:3000 co-drawing-frontend
```

### 静态服务器
```bash
npm run build
npx serve -s dist -l 3000
```

## 常见问题

**Q: 笔触延迟很高？**
A: 检查 WebSocket 连接，调整笔触批处理大小

**Q: Canvas 渲染模糊？**
A: 使用高 DPI 显示器时，devicePixelRatio 会自动调整

**Q: 移动设备上无法绘画？**
A: 使用 touch 事件支持，检查触屏驱动

## 下一步

- Phase 2: AI 增强功能
- Phase 3: 作品分享和画廊
- Phase 4: 移动端应用
