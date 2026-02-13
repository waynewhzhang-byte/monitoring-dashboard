/**
 * 开发环境：同时启动 Next.js 开发服务器与采集器
 * 用法: node scripts/dev-all.js 或 npm run dev:all
 *
 * 功能:
 * - 启动 Next.js 开发服务器 (http://localhost:3000)
 * - 启动数据采集器 (定时从 OpManager 采集数据)
 * - 优雅退出时清理所有子进程
 */
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const opts = { stdio: 'inherit', shell: true, cwd: rootDir };

console.log('🚀 启动开发环境...\n');
console.log('📦 Next.js 开发服务器: http://localhost:3000');
console.log('⚡ 数据采集器: 后台运行\n');

// 启动 Next.js 开发服务器
const next = spawn('npm', ['run', 'dev'], opts);

// 启动采集器
const collector = spawn('npm', ['run', 'collector'], opts);

// 优雅退出处理
const killAll = () => {
  console.log('\n🛑 正在停止所有进程...');
  try {
    next.kill('SIGTERM');
  } catch (_) {
    /* ignore */
  }
  try {
    collector.kill('SIGTERM');
  } catch (_) {
    /* ignore */
  }
};

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

next.on('exit', (code) => {
  console.log('Next.js 开发服务器已退出');
  killAll();
  process.exit(code !== null ? code : 0);
});

collector.on('exit', (code) => {
  console.log('数据采集器已退出');
  killAll();
  process.exit(code !== null ? code : 0);
});
