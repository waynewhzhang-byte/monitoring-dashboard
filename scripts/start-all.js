/**
 * 同时启动 Next 服务与采集器（仅用 Node 内置模块，无额外依赖）
 * 用法: node scripts/start-all.js 或 npm run start
 * 若已执行过 npm run build 且 next.config 为 output: 'standalone'，则用 node .next/standalone/server.js 启动 Next
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const standaloneServer = path.join(rootDir, '.next', 'standalone', 'server.js');
const useStandalone = fs.existsSync(standaloneServer);

const opts = { stdio: 'inherit', shell: true, cwd: rootDir };

const next = useStandalone
  ? spawn('node', [standaloneServer], opts)
  : spawn('npm', ['run', 'start:server'], opts);
const collector = spawn('npm', ['run', 'collector'], opts);

const killAll = () => {
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
  killAll();
  process.exit(code !== null ? code : 0);
});
collector.on('exit', (code) => {
  killAll();
  process.exit(code !== null ? code : 0);
});
