# 共绘连接 (Co-Drawing Connections)

机场候机区的AI赋能跨文化艺术协作装置。两个陌生旅客通过实时协作绘画、AI艺术增强和跨境分享创造数字艺术纪念品。

## 🎯 项目特点

- **实时双人协作绘画** - WebSocket低延迟同步（<100ms）
- **AI艺术增强** - 线条识别、形状补全、艺术风格迁移
- **离线部署** - 本地完全独立运行，无需外网
- **多语言支持** - 自动检测用户语言，支持20+语言
- **数字纪念** - 二维码分享、云端画廊、二次创作

## 📋 项目结构

```
co-drawing-connections/
├── frontend-terminal/    # React大屏应用（候机区显示屏）
├── backend/             # Node.js + Express API服务
├── ai-service/          # Python FastAPI AI推理服务
├── mobile-app/          # H5/小程序（扫码分享页面）
├── docs/                # 项目文档
├── docker-compose.yml   # 容器编排配置
└── README.md            # 本文件
```

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ (包含npm/yarn)
- **Python** 3.9+ (包含pip)
- **Git** 
- **NVIDIA CUDA** (可选，GPU加速)

### 开发环境启动

#### 1. 克隆仓库并安装依赖

```bash
git clone <repo-url>
cd co-drawing-connections

# 后端
cd backend
npm install

# AI服务
cd ../ai-service
pip install -r requirements.txt

# 前端
cd ../frontend-terminal
npm install
```

#### 2. 启动开发服务器（3个独立终端）

**终端1 - 后端API服务**
```bash
cd backend
npm run dev
# 监听 http://localhost:3001
```

**终端2 - AI推理服务**
```bash
cd ai-service
python app.py
# 监听 http://localhost:8000
```

**终端3 - 前端应用**
```bash
cd frontend-terminal
npm run dev
# 打开 http://localhost:5173
```

### Docker部署（生产环境）

```bash
docker-compose up --build
```

## 📚 核心功能

### Phase 1: 实时双人绘画（MVP）
- ✅ 用户配对和匹配
- ✅ 实时Canvas同步绘画
- ✅ 多语言UI界面
- ✅ 笔触、橡皮、颜色工具

### Phase 2: AI艺术增强
- ⏳ 线条识别和形状补全
- ⏳ 实时风格迁移预览
- ⏳ 智能创作引导

### Phase 3: 作品分享
- ⏳ 高分辨率导出
- ⏳ 二维码生成
- ⏳ 可选用户账户

### Phase 4: 全球画廊
- ⏳ 本地+云端作品库
- ⏳ 二次创作功能
- ⏳ 社交互动（点赞、评论）

### Phase 5: 移动端
- ⏳ H5响应式应用
- ⏳ 微信小程序版本

## 🔧 技术栈

| 层级 | 技术 | 备注 |
|------|------|------|
| **前端** | React 18, Canvas API, Socket.io | 大屏终端应用 |
| **后端** | Node.js, Express, SQLite | API & WebSocket服务 |
| **AI** | Python, FastAPI, PyTorch | 推理和图像处理 |
| **通信** | WebSocket, Socket.io | 实时双向通信 |
| **部署** | Docker, Docker Compose | 容器化部署 |

## 📖 文档

- [架构设计](docs/ARCHITECTURE.md)
- [API文档](docs/API.md)
- [开发指南](docs/DEVELOPER_GUIDE.md)
- [部署指南](docs/DEPLOYMENT.md)

## 🎨 用户流程

```
1. 用户进场 (3秒)
   ↓
2. 等待配对 (30秒)
   ↓
3. 选择主题 (30秒)
   ↓
4. 实时共创 (8-12分钟)
   ↓
5. AI艺术化 (1-2分钟)
   ↓
6. 生成分享码 (30秒)
   ↓
7. 扫码分享 (30秒)
   
总时长: 15-20分钟
```

## 🔐 隐私与数据

- 用户可匿名使用（可选注册）
- 所有数据本地存储
- 支持数据导出
- 无外部API依赖（仅可选云端备份）

## 📞 支持

问题报告：[GitHub Issues]()

## 📝 许可证

MIT License

---

**开发状态**: 🔨 Phase 1 进行中  
**上次更新**: 2026-05-18
