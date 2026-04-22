/**
 * 开发环境：同时启动 Next.js 开发服务器与采集器
 * 用法: npm run dev | npm run dev:all | node scripts/dev-all.js
 *
 * 功能:
 * - 启动 Next.js 开发服务器 (http://localhost:3000)
 * - 启动数据采集器 (定时从 OpManager 采集数据)
 * - 优雅退出时清理所有子进程
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const shellOpts = { stdio: 'inherit', shell: true, cwd: rootDir };

console.log('🚀 启动开发环境...\n');
console.log('📦 Next.js 开发服务器: http://localhost:3000');
console.log('⚡ 数据采集器: 并行运行（含拓扑同步）\n');

// 直接调用 node_modules 内的 next CLI（勿用 npm run dev，避免与 package.json 的 dev 递归）
const nextCli = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!fs.existsSync(nextCli)) {
  console.error('未找到 Next.js，请在项目根目录执行: npm install');
  process.exit(1);
}
const next = spawn(process.execPath, [nextCli, 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  cwd: rootDir,
});

// 启动采集器
const collector = spawn('npm', ['run', 'collector'], shellOpts);

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
