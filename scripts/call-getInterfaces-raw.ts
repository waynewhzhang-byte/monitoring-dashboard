/**
 * 直接调用 OpManager 的 getInterfaces，并测试不同 name 参数格式
 *
 * 运行: npx tsx scripts/call-getInterfaces-raw.ts
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

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

type DeviceRow = {
  deviceName?: string;
  displayName?: string;
  ipaddress?: string;
};

async function fetchDevicesSample(): Promise<DeviceRow[]> {
  const url = `${baseURL}/api/json/v2/device/listDevices`;
  const res = await axios.get(url, {
    params: { apiKey, rows: 5, page: 1 },
    httpsAgent,
    timeout: 30000,
  });
  const rows = Array.isArray(res.data?.rows) ? (res.data.rows as DeviceRow[]) : [];
  return rows.slice(0, 3);
}

async function tryGetInterfaces(nameParam: string): Promise<{ ok: boolean; count: number; keys: string[] }> {
  const url = `${baseURL}/api/json/device/getInterfaces`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, name: nameParam },
      httpsAgent,
      timeout: 30000,
    });
    const keys = res.data && typeof res.data === 'object' ? Object.keys(res.data) : [];
    const count = Array.isArray(res.data?.interfaces) ? res.data.interfaces.length : 0;
    return { ok: true, count, keys };
  } catch (e: any) {
    return { ok: false, count: 0, keys: [String(e.response?.status ?? e.message ?? 'error')] };
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('BaseURL:', baseURL);
  // eslint-disable-next-line no-console
  console.log('测试接口: GET /api/json/device/getInterfaces?name=...');

  const devices = await fetchDevicesSample();
  if (devices.length === 0) {
    // eslint-disable-next-line no-console
    console.log('listDevices 未返回 rows，无法采样');
    return;
  }

  for (const d of devices) {
    const deviceName = (d.deviceName || '').toString();
    const ip = (d.ipaddress || '').toString();
    // eslint-disable-next-line no-console
    console.log('\n============================================================');
    // eslint-disable-next-line no-console
    console.log('设备:', { deviceName, displayName: d.displayName, ipaddress: ip });

    const candidates = Array.from(
      new Set(
        [deviceName, ip, `${ip}.10000000001`, `${deviceName}.10000000001`].filter((x) => x && x !== 'unknown')
      )
    );

    for (const nameParam of candidates) {
      const r = await tryGetInterfaces(nameParam);
      // eslint-disable-next-line no-console
      console.log(`- name=${nameParam} -> ${r.ok ? 'OK' : 'FAIL'} count=${r.count} keys=${r.keys.join(',')}`);
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
