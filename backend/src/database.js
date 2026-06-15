import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  initialize() {
    try {
      // 创建数据目录
      const dbPath = config.DATABASE_PATH;
      const dbDir = path.dirname(dbPath);

      console.log(`📁 数据库路径: ${dbPath}`);

      this.db = new Database(dbPath, {
        verbose: config.DEBUG ? console.log : undefined
      });

      // 启用外键约束
      this.db.pragma('foreign_keys = ON');

      this.createTables();
      console.log('✅ 数据库初始化完成');

      return this.db;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      process.exit(1);
    }
  }

  createTables() {
    // 用户表 (可选，用于注册用户)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        username TEXT,
        password_hash TEXT,
        language TEXT DEFAULT 'en',
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 配对会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_a_id TEXT NOT NULL,
        user_b_id TEXT,
        theme TEXT,
        language TEXT DEFAULT 'en',
        status TEXT DEFAULT 'waiting', -- waiting, matched, drawing, completed, cancelled
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        ip_a TEXT,
        ip_b TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 笔触数据表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS strokes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        stroke_data BLOB NOT NULL,
        stroke_index INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 作品表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artworks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_a_id TEXT NOT NULL,
        user_b_id TEXT,
        title TEXT,
        theme TEXT,
        image_data BLOB NOT NULL,
        thumbnail_data BLOB,
        qr_code TEXT,
        json_metadata TEXT,
        public BOOLEAN DEFAULT 0,
        parent_artwork_id TEXT,
        is_derivative BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 图库表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artwork_id TEXT NOT NULL,
        category TEXT,
        sort_order INTEGER,
        is_featured BOOLEAN DEFAULT 0,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id)
      )
    `);

    // 二维码映射表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qr_mappings (
        code TEXT PRIMARY KEY,
        artwork_id TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id)
      )
    `);

    console.log('📊 所有数据表创建完成');
  }

  getConnection() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

const dbManager = new DatabaseManager();

export default dbManager;
