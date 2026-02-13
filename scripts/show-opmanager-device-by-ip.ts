/**
 * 根据 IP 从 OpManager listDevices 中打印原始设备行（用于确认 deviceName 形态）
 *
 * 运行: npx tsx scripts/show-opmanager-device-by-ip.ts 172.16.1.2
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

const ip = (process.argv[2] || '').trim();
if (!ip) {
  // eslint-disable-next-line no-console
  console.error('用法: npx tsx scripts/show-opmanager-device-by-ip.ts <ip>');
  process.exit(1);
}

async function main() {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const url = `${baseURL}/api/json/v2/device/listDevices`;
  const res = await axios.get(url, {
    params: { apiKey, rows: 500, page: 1 },
    httpsAgent,
    timeout: 30000,
  });
  const rows: any[] = Array.isArray(res.data?.rows) ? res.data.rows : [];
  const row = rows.find((d) => String(d?.ipaddress || '').trim() === ip);
  if (!row) {
    // eslint-disable-next-line no-console
    console.log(`未找到 ipaddress=${ip} 的设备，listDevices returned=${rows.length}`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log('找到设备：');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(row, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

