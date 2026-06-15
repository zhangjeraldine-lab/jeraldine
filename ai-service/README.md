# 共绘连接 - AI 推理服务

FastAPI + PyTorch 的深度学习推理服务，提供线条识别、形状补全、艺术风格转移

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 启动开发服务器
```bash
python app.py
```

服务将在 `http://localhost:8000` 启动

API 文档: `http://localhost:8000/docs`

## API 端点

### 健康检查
```
GET /api/health
```
返回服务状态和可用设备信息

### 笔触识别
```
POST /api/stroke/recognize
Content-Type: application/json

{
  "points": [[x1, y1, pressure1], [x2, y2, pressure2], ...],
  "color": "#ffffff",
  "size": 3.0
}
```

返回识别的形状类型和置信度

### 形状补全
```
POST /api/stroke/complete
Content-Type: application/json

{
  "points": [[x1, y1, pressure1], ...],
  "color": "#ffffff",
  "size": 3.0
}
```

返回补全建议

### 风格转移
```
POST /api/art/stylize
Content-Type: application/json

{
  "image_base64": "data:image/png;base64,...",
  "style": "watercolor",
  "quality": 0.95
}
```

支持的风格：
- `watercolor` - 水彩
- `oil_painting` - 油画
- `sketch` - 素描
- `digital` - 数字艺术
- `comic` - 漫画
- `abstract` - 抽象

### 获取可用样式
```
GET /api/styles
```

### 获取可识别形状
```
GET /api/shapes
```

## 环境变量

```
HOST=0.0.0.0
PORT=8000
WORKERS=2
USE_GPU=true
MODELS_DIR=./models
DEBUG=false
STROKE_BATCH_SIZE=32
STYLE_QUALITY=0.95
```

## 架构

```
FastAPI Server
├── Stroke Recognizer
│   ├── 形状识别
│   ├── 特征提取
│   └── 补全建议
├── Style Transfer
│   ├── 图像预处理
│   ├── 风格转移
│   └── 后处理
└── Models
    ├── 线条分类器
    ├── 形状补全网络
    └── 风格迁移模型
```

## 性能指标

- 线条识别: < 50ms（CPU）
- 风格转移: < 2s（GPU上）
- 批处理: 支持 32 个样本并发

## 模型

### Phase 1（当前）
- 基于启发式规则的线条识别
- 简单滤镜效果风格转移

### Phase 2（计划）
- 深度学习线条分类
- GAN 风格转移
- 实时推理优化

### Phase 3（计划）
- 多语言文本识别
- 高级图像处理
- 模型蒸馏和量化

## 部署

### Docker
```bash
docker build -t co-drawing-ai .
docker run --gpus all -p 8000:8000 co-drawing-ai
```

### GPU 支持
需要 NVIDIA Docker：
```bash
docker run --gpus all -p 8000:8000 co-drawing-ai
```

### CPU 模式
```bash
USE_GPU=false python app.py
```

## 调试

启用调试模式：
```bash
DEBUG=true python app.py
```

查看请求日志：
```bash
python app.py --log-level debug
```

## 常见问题

**Q: 风格转移很慢？**
A: 使用 GPU 加速：`USE_GPU=true`

**Q: 如何添加新的识别形状？**
A: 编辑 `StrokeRecognizer.recognize_shape()` 方法

**Q: 如何集成自己的模型？**
A: 继承 `StyleTransferModel` 基类并实现 `forward()` 方法
