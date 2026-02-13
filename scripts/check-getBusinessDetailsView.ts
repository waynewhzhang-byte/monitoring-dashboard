/**
 * 检查 data-collector 的 getBusinessDetailsView 是否能从 OpManager 获取数据
 * 使用与 /api/dashboard/grouped-devices 相同的 OpManagerDataCollector 调用路径，便于先确认接口是否通
 *
 * 用法:
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-getBusinessDetailsView.ts
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-getBusinessDetailsView.ts test2
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-getBusinessDetailsView.ts "新的业务视图"
 *   BV_NAME=test2 npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/check-getBusinessDetailsView.ts
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { OpManagerDataCollector } from '@/services/opmanager/data-collector';

const bvName = process.env.BV_NAME || process.argv[2] || 'test2';

async function main() {
  const baseUrl = (process.env.OPMANAGER_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.OPMANAGER_API_KEY || '';

  if (!baseUrl || !apiKey) {
    console.error('缺少环境变量: 请在 .env.local 中配置 OPMANAGER_BASE_URL 和 OPMANAGER_API_KEY');
    process.exit(1);
  }

  console.log('=== 检查 data-collector.getBusinessDetailsView 是否可获取数据 ===\n');
  console.log('OPMANAGER_BASE_URL:', baseUrl);
  console.log('bvName:', bvName);
  console.log('');

  const collector = new OpManagerDataCollector(baseUrl, apiKey);

  try {
    const response = await collector.getBusinessDetailsView(bvName, 0, 200);

    if (!response) {
      console.log('结果: getBusinessDetailsView 返回 null（接口可能报错或未返回数据）');
      process.exit(1);
    }

    const bv = response.BusinessDetailsView ?? (response as any).businessDetailsView ?? {};
    const bvAny = bv as Record<string, unknown>;
    const total = (bv.TotalRecords ?? bvAny.totalRecords ?? '?') as string;
    const details = (bv.Details ?? bvAny.details ?? []) as any[];
    const list = Array.isArray(details) ? details : [];

    console.log('--- 响应摘要 ---');
    console.log('TotalRecords:', total);
    console.log('Details 条数:', list.length);
    console.log('');

    if (list.length === 0) {
      console.log('结论: 能调通接口，但当前业务视图下无设备。请确认 bvName 与 OpManager 中完全一致（如 test2）。');
      return;
    }

    console.log('--- 前 5 条设备（用于核对与本地设备匹配） ---');
    list.slice(0, 5).forEach((d: any, i: number) => {
      const name = d.name ?? d.Name ?? '-';
      const displayName = d.displayName ?? d.DisplayName ?? '-';
      const ip = d.IpAddress ?? d.ipAddress ?? '-';
      console.log(`  ${i + 1}. name="${name}" displayName="${displayName}" IpAddress="${ip}"`);
    });
    if (list.length > 5) console.log('  ... 共', list.length, '条');
    console.log('');
    console.log('结论: data-collector.getBusinessDetailsView 能获取到数据。若大屏仍无数据，请检查 grouped-devices 中的设备匹配逻辑（name/IpAddress 与本地 Device 的 opmanagerId/ipAddress 是否一致）。');
  } catch (err: any) {
    console.error('调用失败:', err.message);
    if (err.response) {
      console.error('HTTP 状态:', err.response.status, err.response.statusText);
      console.error('响应摘要:', JSON.stringify(err.response.data).slice(0, 300));
    }
    process.exit(1);
  }
}

main();
