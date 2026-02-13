/**
 * 调用 OpManager getBusinessDetailsView 接口，获取业务视图设备性能
 * API: GET /api/json/businessview/getBusinessDetailsView?bvName=xxx&startPoint=0&viewLength=50
 *
 * 用法:
 *   npx tsx scripts/call-getBusinessDetailsView.ts
 *   npx tsx scripts/call-getBusinessDetailsView.ts test2
 *   npx tsx scripts/call-getBusinessDetailsView.ts "新的业务视图"
 *   BV_NAME=test2 npx tsx scripts/call-getBusinessDetailsView.ts
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import axios from 'axios';
import https from 'https';

const bvName = process.env.BV_NAME || process.argv[2] || 'test2';

async function main() {
  const baseURL = (process.env.OPMANAGER_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.OPMANAGER_API_KEY || '';

  if (!baseURL || !apiKey) {
    console.error('缺少环境变量: 请在 .env.local 中配置 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY');
    process.exit(1);
  }

  const url = `${baseURL}/api/json/businessview/getBusinessDetailsView`;
  const params = { apiKey, bvName, startPoint: 0, viewLength: 100 };

  console.log('请求:', url);
  console.log('参数: bvName=%s, startPoint=0, viewLength=100\n', bvName);

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const res = await axios.get(url, {
      params,
      timeout: 30000,
      httpsAgent,
      headers: { Accept: 'application/json' },
    });

    const data = res.data;
    console.log('HTTP 状态:', res.status, res.statusText);
    console.log('响应顶层字段:', Object.keys(data).join(', '));

    const bv = data.BusinessDetailsView ?? data.businessDetailsView ?? data;
    const total = bv.TotalRecords ?? bv.totalRecords ?? '?';
    const details = bv.Details ?? bv.details ?? [];

    console.log('\n--- 业务视图设备性能 ---');
    console.log('TotalRecords:', total);
    console.log('Details 数量:', Array.isArray(details) ? details.length : 0);

    if (Array.isArray(details) && details.length > 0) {
      console.log('\n前 5 条设备 (name / displayName / IpAddress / CPU / Mem):');
      details.slice(0, 5).forEach((d: any, i: number) => {
        console.log(
          `  ${i + 1}. name=${d.name ?? d.Name} displayName=${d.displayName ?? d.DisplayName ?? '-'} IpAddress=${d.IpAddress ?? d.ipAddress ?? '-'} CPU=${d.CPUUtilization ?? d.cpuUtilization ?? '-'}% Mem=${d.MemUtilization ?? d.memUtilization ?? '-'}%`
        );
      });
      if (details.length > 5) {
        console.log('  ... 共', details.length, '条');
      }
    } else {
      console.log('\n(无设备或响应格式与预期不符，请核对 bvName 是否与 OpManager 中完全一致，如 test2)');
    }
  } catch (err: any) {
    console.error('请求失败:', err.message);
    if (err.response) {
      console.error('状态:', err.response.status, err.response.statusText);
      console.error('响应:', JSON.stringify(err.response.data).slice(0, 500));
    }
    process.exit(1);
  }
}

main();
