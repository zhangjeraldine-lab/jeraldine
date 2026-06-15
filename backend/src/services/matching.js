import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

class MatchingService {
  constructor(db) {
    this.db = db;
    this.waitingQueue = new Map(); // userId -> { socketId, language, preferences, timestamp }
    this.activeSessions = new Map(); // sessionId -> { userA, userB, theme, status }
  }

  // 用户加入等待队列
  addToQueue(userId, socketId, userInfo = {}) {
    const { language = config.DEFAULT_LANGUAGE, country = null } = userInfo;

    this.waitingQueue.set(userId, {
      socketId,
      language,
      country,
      timestamp: Date.now(),
    });

    console.log(`👤 用户 ${userId} 加入等待队列 (语言: ${language})`);
    return { status: 'waiting', queuePosition: this.waitingQueue.size };
  }

  // 从等待队列移除
  removeFromQueue(userId) {
    if (this.waitingQueue.has(userId)) {
      this.waitingQueue.delete(userId);
      console.log(`👤 用户 ${userId} 离开等待队列`);
    }
  }

  // 尝试配对
  attemptMatch() {
    if (this.waitingQueue.size < 2) {
      return null; // 需要至少两个用户
    }

    // 获取最早进入队列的两个用户
    const users = Array.from(this.waitingQueue.entries());
    const [userIdA, userAInfo] = users[0];
    const [userIdB, userBInfo] = users[1];

    // 移出队列
    this.waitingQueue.delete(userIdA);
    this.waitingQueue.delete(userIdB);

    // 创建会话
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userA: userIdA,
      userB: userIdB,
      userALanguage: userAInfo.language,
      userBLanguage: userBInfo.language,
      status: 'matched',
      theme: null,
      strokes: [],
      createdAt: Date.now(),
    };

    this.activeSessions.set(sessionId, session);

    // 保存到数据库
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, user_a_id, user_b_id, language, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        sessionId,
        userIdA,
        userIdB,
        userAInfo.language,
        'matched'
      );
    } catch (error) {
      console.error('❌ 保存会话失败:', error);
    }

    console.log(`🤝 新配对: ${userIdA} <-> ${userIdB} (会话: ${sessionId})`);

    return {
      sessionId,
      userA: userIdA,
      userB: userIdB,
      socketA: userAInfo.socketId,
      socketB: userBInfo.socketId,
      userALanguage: userAInfo.language,
      userBLanguage: userBInfo.language,
    };
  }

  // 强制配对（超时）
  forceMatch() {
    if (this.waitingQueue.size > 0) {
      return this.attemptMatch();
    }
    return null;
  }

  // 检查并自动配对
  autoMatchCheck() {
    const now = Date.now();
    const waitThreshold = config.MATCHING.WAIT_TIMEOUT;

    for (const [userId, userInfo] of this.waitingQueue) {
      if (now - userInfo.timestamp > waitThreshold) {
        console.log(`⏱️ 用户 ${userId} 等待超时，触发强制配对`);
        return this.attemptMatch();
      }
    }

    return null;
  }

  // 获取会话信息
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  // 完成会话
  completeSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.status = 'completed';
      session.completedAt = Date.now();

      // 更新数据库
      try {
        const stmt = this.db.prepare(`
          UPDATE sessions SET status = ?, completed_at = ? WHERE id = ?
        `);
        stmt.run('completed', new Date().toISOString(), sessionId);
      } catch (error) {
        console.error('❌ 更新会话状态失败:', error);
      }

      console.log(`✅ 会话 ${sessionId} 已完成`);
    }
  }

  // 取消会话
  cancelSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.delete(sessionId);

      try {
        const stmt = this.db.prepare(`
          UPDATE sessions SET status = ? WHERE id = ?
        `);
        stmt.run('cancelled', sessionId);
      } catch (error) {
        console.error('❌ 更新会话状态失败:', error);
      }

      console.log(`❌ 会话 ${sessionId} 已取消`);
    }
  }

  // 获取队列统计
  getQueueStats() {
    return {
      waitingCount: this.waitingQueue.size,
      activeSessions: this.activeSessions.size,
      languageDistribution: this.getLanguageDistribution(),
    };
  }

  // 获取语言分布
  getLanguageDistribution() {
    const distribution = {};
    for (const userInfo of this.waitingQueue.values()) {
      const lang = userInfo.language;
      distribution[lang] = (distribution[lang] || 0) + 1;
    }
    return distribution;
  }
}

export default MatchingService;
