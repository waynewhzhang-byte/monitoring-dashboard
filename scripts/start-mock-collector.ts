
// Load environment variables first
require('dotenv').config();

// 启动 Mock Collector
// 这将强制开启 mock 模式并运行 collector 调度器

process.env.USE_MOCK_DATA = 'true';
// @ts-ignore
process.env.NODE_ENV = 'development';

// 满足 Zod schema 验证的 Mock 值
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mock_db';
process.env.OPMANAGER_BASE_URL = process.env.OPMANAGER_BASE_URL || 'http://mock-opmanager.local';
process.env.OPMANAGER_API_KEY = process.env.OPMANAGER_API_KEY || 'mock-api-key';

console.log('🚀 Starting System in Mock Mode...');
console.log('📦 Mock Data Store Initialized.');

// 引入真实的 collector 启动脚本
// 使用路径别名以支持跨平台兼容
import '@/services/collector/start';
