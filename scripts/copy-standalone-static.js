/**
 * standalone 构建后复制 .next/static 和 public 到 .next/standalone
 * 否则运行 node .next/standalone/server.js 时 CSS/JS 等静态资源会 404
 * 用法：在 npm run build 之后执行 node scripts/copy-standalone-static.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const nextStatic = path.join(root, '.next', 'static');
const publicDir = path.join(root, 'public');
const standaloneNext = path.join(standalone, '.next');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(standalone)) {
  console.warn('scripts/copy-standalone-static.js: .next/standalone not found, run "npm run build" first.');
  process.exit(0);
}

if (fs.existsSync(nextStatic)) {
  const destStatic = path.join(standaloneNext, 'static');
  copyRecursive(nextStatic, destStatic);
  console.log('Copied .next/static -> .next/standalone/.next/static');
} else {
  console.warn('scripts/copy-standalone-static.js: .next/static not found.');
}

if (fs.existsSync(publicDir)) {
  const destPublic = path.join(standalone, 'public');
  copyRecursive(publicDir, destPublic);
  console.log('Copied public -> .next/standalone/public');
} else {
  console.warn('scripts/copy-standalone-static.js: public not found.');
}

console.log('Standalone static copy done.');
