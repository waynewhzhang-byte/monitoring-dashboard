/**
 * 测试环境变量加载
 * 使用方法：npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/test-env.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('\n环境变量检查:');
console.log('='.repeat(80));

const requiredEnvVars = [
  'DATABASE_URL',
  'OPMANAGER_BASE_URL',
  'OPMANAGER_API_KEY',
  'REDIS_URL',
  'NODE_ENV',
  'PORT'
];

let allPresent = true;

requiredEnvVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    // 隐藏敏感信息
    const displayValue = key.includes('KEY') || key.includes('PASSWORD') || key.includes('URL')
      ? value.substring(0, 20) + '...'
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: 未设置`);
    allPresent = false;
  }
});

console.log('='.repeat(80));

if (allPresent) {
  console.log('\n✅ 所有必需的环境变量都已正确设置！');
  process.exit(0);
} else {
  console.log('\n❌ 有环境变量缺失，请检查 .env 文件');
  process.exit(1);
}
