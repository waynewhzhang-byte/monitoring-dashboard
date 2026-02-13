/**
 * 直接调用 OpManager listDevices，找出 interfaceCount>0 的设备
 *
 * 运行: npx tsx scripts/listDevices-interfaceCount.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import https from 'https';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const baseURL = (process.env.OPMANAGER_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.OPMANAGER_API_KEY || '';

if (!baseURL || !apiKey) {
  // eslint-disable-next-line no-console
  console.error('缺少环境变量: OPMANAGER_BASE_URL 或 OPMANAGER_API_KEY');
  process.exit(1);
}

type DeviceRow = {
  deviceName?: string;
  displayName?: string;
  ipaddress?: string;
  type?: string;
  category?: string;
  interfaceCount?: number;
  statusStr?: string;
};

async function main() {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const url = `${baseURL}/api/json/v2/device/listDevices`;
  const res = await axios.get(url, {
    params: { apiKey, rows: 200, page: 1 },
    httpsAgent,
    timeout: 30000,
  });
  const rows: DeviceRow[] = Array.isArray(res.data?.rows) ? res.data.rows : [];

  // eslint-disable-next-line no-console
  console.log('HTTP:', res.status);
  // eslint-disable-next-line no-console
  console.log('records:', res.data?.records, 'returned:', rows.length);

  const withIf = rows.filter((d) => (d.interfaceCount || 0) > 0);
  const withIfTop = withIf
    .slice()
    .sort((a, b) => (b.interfaceCount || 0) - (a.interfaceCount || 0))
    .slice(0, 15);

  // eslint-disable-next-line no-console
  console.log('\ninterfaceCount>0 设备数:', withIf.length);
  // eslint-disable-next-line no-console
  console.log('Top 15:');
  for (const d of withIfTop) {
    // eslint-disable-next-line no-console
    console.log(
      `- ${d.displayName || d.deviceName} ip=${d.ipaddress} if=${d.interfaceCount} status=${d.statusStr} type=${d.type} category=${d.category}`
    );
  }

  if (withIfTop.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\n提示: 可用这些设备做接口同步验证（理论上应该能拉到 interfaces）。');
  } else {
    // eslint-disable-next-line no-console
    console.log('\n未发现 interfaceCount>0 的设备：若 OpManager 里确实有交换机/路由器，请确认它们被纳入监控且接口采集开启。');
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
