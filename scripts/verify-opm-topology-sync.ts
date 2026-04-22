/**
 * 仅验证与 OpManager 的 getBVDetails 是否成功、返回多少节点/边（不写库）。
 * 依赖 .env.local 中 OPMANAGER_BASE_URL、OPMANAGER_API_KEY。
 *
 * 用法:
 *   npx tsx scripts/verify-opm-topology-sync.ts
 *   npx tsx scripts/verify-opm-topology-sync.ts TEST1 TEST2
 */
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });
config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const names =
    process.argv.length > 2 ? process.argv.slice(2) : ['TEST1', 'TEST2'];

  const { opClient } = await import('../src/services/opmanager/client');

  console.log('验证 OpManager getBVDetails（不写数据库）\n');

  for (const bvName of names) {
    const data = await opClient.getBVDetails(bvName);
    if (!data) {
      console.log(`❌ ${bvName}: getBVDetails → null（网络错误、证书、或响应非 JSON）`);
      continue;
    }
    const dp = Array.isArray(data.deviceProperties) ? data.deviceProperties.length : 0;
    const lp = Array.isArray(data.linkProperties) ? data.linkProperties.length : 0;
    const ok = dp > 0 || lp > 0;
    console.log(
      `${ok ? '✅' : '⚠️'} ${bvName}: responded=true, deviceProperties=${dp}, linkProperties=${lp}`
    );
    if (!ok) {
      console.log(
        `   → bvName 与 OpManager 不一致，或该业务视图下未绘制设备/连线。请与 OPM 控制台中的视图标识逐字核对。`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
