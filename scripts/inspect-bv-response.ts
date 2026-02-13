/**
 * 查看 getBVDetails(bvName) 的原始返回结构
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

async function run() {
  const bvName = process.argv[2] || 'TEST2_bv';
  console.log(`\n查看 getBVDetails("${bvName}") 的原始返回结构...\n`);

  const { opClient } = await import('../src/services/opmanager/client');
  const res = await opClient.getBVDetails(bvName);

  if (res == null) {
    console.log('返回为 null/undefined\n');
    return;
  }

  console.log('顶层 keys:', Object.keys(res));
  console.log('');
  if (res.deviceProperties !== undefined) {
    console.log('deviceProperties 类型:', Array.isArray(res.deviceProperties) ? 'array' : typeof res.deviceProperties);
    console.log('deviceProperties 长度:', Array.isArray(res.deviceProperties) ? res.deviceProperties.length : '-');
  } else {
    console.log('deviceProperties: 不存在');
  }
  if (res.linkProperties !== undefined) {
    console.log('linkProperties 类型:', Array.isArray(res.linkProperties) ? 'array' : typeof res.linkProperties);
    console.log('linkProperties 长度:', Array.isArray(res.linkProperties) ? res.linkProperties.length : '-');
  } else {
    console.log('linkProperties: 不存在');
  }
  console.log('');

  // 可能被包在别的字段里（如 result / data / BusinessView 等）
  const maybe = (res as any).result ?? (res as any).data ?? (res as any).BusinessView ?? (res as any).getBVDetails;
  if (maybe && typeof maybe === 'object') {
    console.log('发现嵌套 result/data/BusinessView/getBVDetails，其 keys:', Object.keys(maybe));
    if (Array.isArray((maybe as any).deviceProperties)) {
      console.log('  deviceProperties 在内层，长度:', (maybe as any).deviceProperties.length);
    }
    if (Array.isArray((maybe as any).linkProperties)) {
      console.log('  linkProperties 在内层，长度:', (maybe as any).linkProperties.length);
    }
  }

  // 打印原始 JSON 的前 2000 字符，便于排查
  const json = JSON.stringify(res, null, 2);
  console.log('\n原始返回（前 2000 字符）:\n', json.slice(0, 2000));
  if (json.length > 2000) console.log('... (已截断)\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
