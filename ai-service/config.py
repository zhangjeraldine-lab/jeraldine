import os
from typing import Optional

class Config:
    # FastAPI配置
    API_TITLE = "Co-Drawing Connections AI Service"
    API_VERSION = "1.0.0"
    API_DESCRIPTION = "AI推理服务，包含线条识别、形状补全、风格迁移"

    # 服务器配置
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    WORKERS = int(os.getenv("WORKERS", 2))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    # 模型配置
    MODELS_DIR = os.getenv("MODELS_DIR", "./models")
    USE_GPU = os.getenv("USE_GPU", "True").lower() == "true"
    DEVICE = "cuda" if USE_GPU else "cpu"

    # 推理配置
    STROKE_BATCH_SIZE = int(os.getenv("STROKE_BATCH_SIZE", 32))
    STYLE_QUALITY = float(os.getenv("STYLE_QUALITY", 0.95))
    COMPLETION_THRESHOLD = float(os.getenv("COMPLETION_THRESHOLD", 0.7))

    # 缓存配置
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "True").lower() == "true"
    CACHE_MAX_SIZE = int(os.getenv("CACHE_MAX_SIZE", 100))

    # 请求限制
    MAX_IMAGE_SIZE = 4096  # 像素
    MAX_REQUEST_SIZE = 50 * 1024 * 1024  # 50MB

config = Config()
