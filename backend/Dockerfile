FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源码
COPY src ./src

# 创建数据目录
RUN mkdir -p ./data

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["node", "src/index.js"]
