from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
import io
from PIL import Image
import json
import logging
from config import config

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化FastAPI应用
app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    description=config.API_DESCRIPTION,
)

# ===== 数据模型 =====

class StrokeData(BaseModel):
    """笔触数据模型"""
    points: List[List[float]]  # [[x, y, pressure], ...]
    color: str
    size: float

class RecognitionResult(BaseModel):
    """识别结果"""
    shape_type: str  # circle, line, rectangle, etc.
    confidence: float
    bounding_box: Optional[List[float]]
    suggested_completion: Optional[str]

class StyleTransferRequest(BaseModel):
    """风格转移请求"""
    image_base64: str
    style: str  # watercolor, oil_painting, sketch, etc.
    quality: float = 0.95

# ===== 笔触识别模块 =====

class StrokeRecognizer:
    """笔触识别器"""

    @staticmethod
    def recognize_shape(stroke: StrokeData) -> RecognitionResult:
        """识别笔触形状"""
        points = np.array(stroke.points)[:, :2]  # 只取x, y坐标

        if len(points) < 3:
            return RecognitionResult(
                shape_type="unknown",
                confidence=0.0,
                bounding_box=None,
                suggested_completion=None,
            )

        # 计算笔触特征
        x_coords = points[:, 0]
        y_coords = points[:, 1]
        x_range = x_coords.max() - x_coords.min()
        y_range = y_coords.max() - y_coords.min()
        aspect_ratio = x_range / (y_range + 1e-6)

        # 简单的形状识别逻辑
        if abs(aspect_ratio - 1.0) < 0.2 and x_range > 20 and y_range > 20:
            return RecognitionResult(
                shape_type="circle",
                confidence=0.85,
                bounding_box=[x_coords.min(), y_coords.min(), x_range, y_range],
                suggested_completion="完整化这个圆形",
            )
        elif abs(aspect_ratio) > 3:
            return RecognitionResult(
                shape_type="line",
                confidence=0.9,
                bounding_box=[x_coords.min(), y_coords.min(), x_range, y_range],
                suggested_completion=None,
            )
        elif x_range > 30 and y_range > 30:
            return RecognitionResult(
                shape_type="rectangle",
                confidence=0.75,
                bounding_box=[x_coords.min(), y_coords.min(), x_range, y_range],
                suggested_completion="补充矩形的角",
            )
        else:
            return RecognitionResult(
                shape_type="unknown",
                confidence=0.5,
                bounding_box=[x_coords.min(), y_coords.min(), x_range, y_range],
                suggested_completion=None,
            )

    @staticmethod
    def suggest_completion(shape_type: str) -> str:
        """建议补全方案"""
        suggestions = {
            "circle": "添加更多细节来完成圆形的轮廓",
            "line": "使用笔刷加粗这条线",
            "rectangle": "补充缺失的边或角",
            "triangle": "闭合三角形的开口",
        }
        return suggestions.get(shape_type, "继续绘画")

# ===== API 路由 =====

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "model": "stroke-recognizer",
        "device": config.DEVICE,
        "gpu_available": config.USE_GPU,
    }

@app.post("/api/stroke/recognize")
async def recognize_stroke(stroke: StrokeData) -> RecognitionResult:
    """识别笔触形状"""
    try:
        recognizer = StrokeRecognizer()
        result = recognizer.recognize_shape(stroke)
        logger.info(f"✅ 识别结果: {result.shape_type} (置信度: {result.confidence})")
        return result
    except Exception as e:
        logger.error(f"❌ 识别失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stroke/complete")
async def complete_shape(stroke: StrokeData):
    """形状补全"""
    try:
        recognizer = StrokeRecognizer()
        result = recognizer.recognize_shape(stroke)

        # 返回补全建议
        return {
            "original_shape": result.shape_type,
            "completion_suggestion": StrokeRecognizer.suggest_completion(
                result.shape_type
            ),
            "confidence": result.confidence,
        }
    except Exception as e:
        logger.error(f"❌ 补全失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/art/stylize")
async def stylize_image(request: StyleTransferRequest):
    """风格转移"""
    try:
        # 解码base64图像
        image_data = request.image_base64.split(",")[1]
        image_bytes = io.BytesIO(__import__("base64").b64decode(image_data))
        image = Image.open(image_bytes)

        # 简单的风格模拟 (Phase 2会使用真实的AI模型)
        image_array = np.array(image)

        # 应用简单的滤镜效果
        if request.style == "watercolor":
            # 模糊效果模拟水彩
            result = cv2.GaussianBlur(image_array, (15, 15), 0)
        elif request.style == "oil_painting":
            # 双边滤波模拟油画
            result = cv2.bilateralFilter(image_array, 9, 75, 75)
        elif request.style == "sketch":
            # 边缘检测
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            result = cv2.Canny(gray, 100, 200)
            result = cv2.cvtColor(result, cv2.COLOR_GRAY2RGB)
        else:
            result = image_array

        # 编码结果
        result_image = Image.fromarray(result.astype("uint8"))
        result_bytes = io.BytesIO()
        result_image.save(result_bytes, format="PNG")
        result_base64 = (
            "data:image/png;base64,"
            + __import__("base64")
            .b64encode(result_bytes.getvalue())
            .decode()
        )

        logger.info(f"✅ 风格转移完成: {request.style}")
        return {"stylized_image": result_base64, "style": request.style}

    except Exception as e:
        logger.error(f"❌ 风格转移失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/styles")
async def get_available_styles():
    """获取可用的风格列表"""
    return {
        "styles": [
            "watercolor",
            "oil_painting",
            "sketch",
            "digital",
            "comic",
            "abstract",
        ]
    }

@app.get("/api/shapes")
async def get_shape_suggestions():
    """获取可识别的形状列表"""
    return {
        "shapes": [
            "circle",
            "line",
            "rectangle",
            "triangle",
            "star",
            "heart",
            "curve",
        ]
    }

@app.get("/")
async def root():
    """根路由"""
    return {
        "message": "🎨 Co-Drawing Connections AI Service",
        "endpoints": {
            "/api/health": "健康检查",
            "/api/stroke/recognize": "笔触识别",
            "/api/stroke/complete": "形状补全",
            "/api/art/stylize": "风格转移",
            "/api/styles": "获取可用风格",
            "/api/shapes": "获取可识别形状",
        },
    }

# 启动应用
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=config.HOST,
        port=config.PORT,
        workers=config.WORKERS,
        reload=config.DEBUG,
    )
