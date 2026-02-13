/**
 * 手动运行接口同步（不依赖 Next API 路由）
 *
 * 运行:
 * npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/run-interface-sync.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';

// 必须在导入业务代码前加载 env（避免 env 校验失败）
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { interfaceCollector } from '@/services/collector/interface';

async function main() {
  // eslint-disable-next-line no-console
  console.log('🔄 Running interface sync (MANUAL)...');
  const stats = await interfaceCollector.syncInterfaces('MANUAL');
  // eslint-disable-next-line no-console
  console.log('✅ Interface sync completed. Stats:');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

