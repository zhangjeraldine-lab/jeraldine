import { Server } from 'socket.io';
import config from '../config.js';

class WebSocketManager {
  constructor(httpServer, matchingService, db) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 25 * 1024 * 1024,
    });

    this.matchingService = matchingService;
    this.db = db;
    this.userSockets = new Map(); // userId -> socket
    this.sessionSockets = new Map(); // sessionId -> [socketA, socketB]
    this.strokeBuffer = new Map(); // sessionId -> [strokes]

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 用户连接: ${socket.id}`);

      // 用户进入大屏（加入等待队列）
      socket.on('enter', (data, callback) => {
        this.handleUserEnter(socket, data, callback);
      });

      // 接收笔触数据
      socket.on('stroke', (data) => {
        this.handleStroke(socket, data);
      });

      // 选择主题
      socket.on('selectTheme', (data) => {
        this.handleThemeSelection(socket, data);
      });

      // 撤销操作
      socket.on('undo', (data) => {
        this.handleUndo(socket, data);
      });

      // 清空画布
      socket.on('clear', (data) => {
        this.handleClear(socket, data);
      });

      // 完成绘画
      socket.on('finishDrawing', (data, callback) => {
        this.handleFinishDrawing(socket, data, callback);
      });

      // 获取统计信息
      socket.on('getStats', (callback) => {
        const stats = this.matchingService.getQueueStats();
        callback(stats);
      });

      // 断开连接
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // 错误处理
      socket.on('error', (error) => {
        console.error(`❌ Socket 错误 [${socket.id}]:`, error);
      });
    });
  }

  handleUserEnter(socket, data, callback) {
    const { userId, language, country } = data;

    // 注册用户的socket
    this.userSockets.set(userId, socket);

    // 加入等待队列
    const queueResult = this.matchingService.addToQueue(userId, socket.id, {
      language,
      country,
    });

    console.log(`⏳ 用户 ${userId} 进入等待队列`);

    // 尝试配对
    const match = this.matchingService.attemptMatch();

    if (match) {
      // 配对成功，通知两个用户
      this.notifyMatch(match);
      callback({ status: 'matched', sessionId: match.sessionId });
    } else {
      // 继续等待
      callback({ status: 'waiting', position: queueResult.queuePosition });

      // 广播队列更新
      this.io.emit('queueUpdated', {
        waitingCount: this.matchingService.waitingQueue.size,
      });
    }
  }

  notifyMatch(match) {
    const { sessionId, socketA, socketB, userALanguage, userBLanguage } = match;

    // 获取socket实例
    const socketsA = this.io.sockets.sockets.get(socketA);
    const socketsB = this.io.sockets.sockets.get(socketB);

    if (socketsA && socketsB) {
      // 加入会话房间
      socketsA.join(sessionId);
      socketsB.join(sessionId);

      // 存储会话socket
      this.sessionSockets.set(sessionId, [socketsA, socketsB]);
      this.strokeBuffer.set(sessionId, []);

      // 发送配对通知
      socketsA.emit('matched', {
        sessionId,
        opponentLanguage: userBLanguage,
        role: 'A',
      });

      socketsB.emit('matched', {
        sessionId,
        opponentLanguage: userALanguage,
        role: 'B',
      });

      console.log(`🤝 会话 ${sessionId} 配对通知已发送`);
    }
  }

  handleStroke(socket, data) {
    const { sessionId, userId, stroke } = data;
    const session = this.matchingService.getSession(sessionId);

    if (!session) {
      console.warn(`⚠️ 无效的会话 ${sessionId}`);
      return;
    }

    // 将笔触加入缓冲区
    if (!this.strokeBuffer.has(sessionId)) {
      this.strokeBuffer.set(sessionId, []);
    }

    this.strokeBuffer.get(sessionId).push({
      userId,
      stroke,
      timestamp: Date.now(),
    });

    // 批量发送笔触数据（减少网络开销）
    if (this.strokeBuffer.get(sessionId).length >= config.WEBSOCKET.STROKE_BATCH_SIZE) {
      this.flushStrokeBatch(sessionId);
    }
  }

  flushStrokeBatch(sessionId) {
    const batch = this.strokeBuffer.get(sessionId);

    if (batch && batch.length > 0) {
      // 发送到对方
      this.io.to(sessionId).emit('strokeBatch', {
        strokes: batch,
        batchSize: batch.length,
      });

      // 存储到数据库
      try {
        const insertStmt = this.db.prepare(`
          INSERT INTO strokes (session_id, user_id, stroke_data, timestamp)
          VALUES (?, ?, ?, ?)
        `);

        for (let i = 0; i < batch.length; i++) {
          const { userId, stroke } = batch[i];
          insertStmt.run(
            sessionId,
            userId,
            JSON.stringify(stroke),
            new Date().toISOString()
          );
        }
      } catch (error) {
        console.error('❌ 存储笔触数据失败:', error);
      }

      // 清空缓冲区
      this.strokeBuffer.set(sessionId, []);
    }
  }

  handleThemeSelection(socket, data) {
    const { sessionId, userId, theme } = data;
    const session = this.matchingService.getSession(sessionId);

    if (!session) return;

    session.theme = theme;

    // 通知会话中的所有用户
    this.io.to(sessionId).emit('themeSelected', {
      theme,
      selectedBy: userId,
    });

    console.log(`🎨 会话 ${sessionId} 选择主题: ${theme}`);
  }

  handleUndo(socket, data) {
    const { sessionId } = data;

    this.io.to(sessionId).emit('undoAction', {
      timestamp: Date.now(),
    });
  }

  handleClear(socket, data) {
    const { sessionId } = data;

    this.io.to(sessionId).emit('clearCanvas', {
      timestamp: Date.now(),
    });
  }

  handleFinishDrawing(socket, data, callback) {
    const { sessionId, userId, finalImage } = data;
    const session = this.matchingService.getSession(sessionId);

    if (!session) return;

    console.log(`✅ 用户 ${userId} 完成绘画 (会话: ${sessionId})`);

    // 通知对方绘画已完成
    this.io.to(sessionId).emit('drawingCompleted', {
      completedBy: userId,
      timestamp: Date.now(),
    });

    // 完成会话
    this.matchingService.completeSession(sessionId);

    callback({ status: 'success', sessionId });
  }

  handleDisconnect(socket) {
    console.log(`🔌 用户断开连接: ${socket.id}`);

    // 从等待队列移除
    for (const [userId, info] of this.matchingService.waitingQueue) {
      if (info.socketId === socket.id) {
        this.matchingService.removeFromQueue(userId);
        this.userSockets.delete(userId);
        break;
      }
    }

    // 关闭相关的会话
    for (const [sessionId, sockets] of this.sessionSockets) {
      if (sockets.includes(socket)) {
        this.matchingService.cancelSession(sessionId);
        this.sessionSockets.delete(sessionId);

        // 通知另一方
        const otherSocket = sockets[0] === socket ? sockets[1] : sockets[0];
        if (otherSocket) {
          otherSocket.emit('opponentDisconnected', {
            sessionId,
          });
        }
      }
    }
  }

  // 广播队列统计
  broadcastQueueStats() {
    const stats = this.matchingService.getQueueStats();
    this.io.emit('queueStats', stats);
  }

  // 获取IO实例
  getIO() {
    return this.io;
  }
}

export default WebSocketManager;
