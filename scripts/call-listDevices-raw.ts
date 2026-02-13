/**
 * 直接调用 OpManager listDevices 并打印原始返回
 * 不依赖 src 的 env 校验，仅需 .env 中的 OPMANAGER_BASE_URL、OPMANAGER_API_KEY
 *
 * 运行: npx tsx scripts/call-listDevices-raw.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import https from 'https';

// 只加载 .env，不加载 src
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const baseURL = (process.env.OPMANAGER_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.OPMANAGER_API_KEY;

if (!baseURL || !apiKey) {
  console.error('缺少环境变量: OPMANAGER_BASE_URL 或 OPMANAGER_API_KEY');
  process.exit(1);
}

const url = `${baseURL}/api/json/v2/device/listDevices`;

async function main() {
  console.log('请求:', url);
  console.log('参数: rows=3, page=1');
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const res = await axios.get(url, {
      params: { apiKey, rows: 3, page: 1 },
      headers: { Accept: 'application/json' },
      httpsAgent,
      timeout: 30000,
    });
    console.log('\nHTTP 状态:', res.status);
    const data = res.data;
    console.log('顶层字段:', Object.keys(data).join(', '));
    if (data.total != null) console.log('total:', data.total);
    if (data.records != null) console.log('records:', data.records);
    if (data.page != null) console.log('page:', data.page);
    const rows = data.rows || [];
    console.log('rows 条数:', rows.length);
    if (rows.length > 0) {
      console.log('\n第一条设备的所有字段名:', Object.keys(rows[0]).join(', '));
      console.log('\n第一条设备完整内容 (type/category 等):');
      console.log(JSON.stringify(rows[0], null, 2));
      if (rows.length > 1) {
        console.log('\n第二条设备 (仅 type/category/deviceName/displayName):');
        const d = rows[1];
        console.log(JSON.stringify({
          deviceName: d?.deviceName ?? d?.name,
          displayName: d?.displayName,
          type: d?.type ?? d?.Type,
          category: d?.category ?? d?.Category,
        }, null, 2));
      }
    }
    console.log('\n完整响应 (data):');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('请求失败:', err.message);
    if (err.response) {
      console.error('状态:', err.response.status);
      console.error('响应:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
