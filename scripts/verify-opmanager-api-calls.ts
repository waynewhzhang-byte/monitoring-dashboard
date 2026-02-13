/**
 * 本系统对 OpManager 的 API 调用逐一验证
 * 确认：是否都有返回结果、是否有报错被吞掉、返回结构是否符合调用方预期
 */

import { config } from 'dotenv';

config({ path: '.env.local', override: true });

type ApiCheck = {
  name: string;
  call: () => Promise<any>;
  expect: 'array' | 'object' | 'any';
  minCount?: number; // 若 expect array，至少期望几条（0 表示允许空）
};

async function run() {
  console.log('\n' + '='.repeat(80));
  console.log('本系统对 OpManager 的 API 调用验证');
  console.log('='.repeat(80) + '\n');

  const baseUrl = process.env.OPMANAGER_BASE_URL;
  const useMock = process.env.USE_MOCK_DATA === 'true';
  if (!baseUrl && !useMock) {
    console.error('❌ 缺少 OPMANAGER_BASE_URL，且未使用 MOCK');
    process.exit(1);
  }
  if (useMock) {
    console.log('⚠️ USE_MOCK_DATA=true，本次仅做「调用是否抛错」检查，不验证真实 OpManager 返回\n');
  }

  // 使用与业务一致的 opClient，确保走同一套错误处理与返回结构
  const { opClient } = await import('../src/services/opmanager/client');

  const checks: ApiCheck[] = [
    {
      name: 'getDevicesPage (listDevices)',
      call: () => opClient.getDevicesPage({ page: 1, rows: 100 }),
      expect: 'object',
    },
    {
      name: 'getAlarms (listAlarms)',
      call: () => opClient.getAlarms(),
      expect: 'array',
      minCount: 0,
    },
    {
      name: 'getBusinessView',
      call: () => opClient.getBusinessView(),
      expect: 'object',
    },
  ];

  // 需要设备名/IP 的接口：从 getDevicesPage 取第一个设备再调
  let firstDeviceName: string | null = null;
  let firstDeviceIp: string | null = null;

  const summary: { name: string; ok: boolean; error?: string; note?: string }[] = [];

  for (const c of checks) {
    process.stdout.write(`  ${c.name} ... `);
    try {
      const res = await c.call();
      if (res === undefined || res === null) {
        summary.push({ name: c.name, ok: false, error: '返回为 undefined/null' });
        console.log('❌ 无返回');
        continue;
      }
      if (c.expect === 'array' && !Array.isArray(res)) {
        summary.push({ name: c.name, ok: false, error: `期望数组，实际 ${typeof res}` });
        console.log('❌ 返回类型不符');
        continue;
      }
      if (c.expect === 'object' && typeof res !== 'object') {
        summary.push({ name: c.name, ok: false, error: `期望对象，实际 ${typeof res}` });
        console.log('❌ 返回类型不符');
        continue;
      }
      if (c.expect === 'object' && c.name.includes('getDevicesPage')) {
        const arr = (res as any).devices;
        if (!Array.isArray(arr)) {
          summary.push({ name: c.name, ok: false, error: '缺少 devices 数组' });
          console.log('❌ 缺少 devices');
          continue;
        }
        firstDeviceName = arr[0]?.name ?? arr[0]?.deviceName ?? null;
        firstDeviceIp = arr[0]?.ipAddress ?? arr[0]?.ipaddress ?? null;
      }
      if (c.expect === 'array' && typeof c.minCount === 'number' && (res as any[]).length < c.minCount) {
        summary.push({ name: c.name, ok: true, note: `条数 ${(res as any[]).length} < 期望最小 ${c.minCount}` });
        console.log(`✅ 有返回，条数=${(res as any[]).length}`);
        continue;
      }
      const count = Array.isArray(res) ? res.length : (res as any).devices?.length ?? (res as any).total ?? '-';
      summary.push({ name: c.name, ok: true, note: String(count) });
      console.log(`✅ 有返回 (${count})`);
    } catch (e: any) {
      summary.push({ name: c.name, ok: false, error: e?.message || String(e) });
      console.log(`❌ 报错: ${e?.message || e}`);
    }
  }

  // 依赖「第一个设备」的接口
  if (firstDeviceName ?? firstDeviceIp) {
    const depChecks: ApiCheck[] = [];
    if (firstDeviceName) {
      depChecks.push(
        { name: 'getDeviceSummary(首个设备名)', call: () => opClient.getDeviceSummary(firstDeviceName!), expect: 'any' },
      );
    }
    if (firstDeviceIp) {
      depChecks.push(
        { name: 'getInterfaces(首个设备IP)', call: () => opClient.getInterfaces({ deviceIpAddress: firstDeviceIp! }), expect: 'array', minCount: 0 },
      );
    }
    for (const c of depChecks) {
      process.stdout.write(`  ${c.name} ... `);
      try {
        const res = await c.call();
        if (res === undefined && c.expect !== 'any') {
          summary.push({ name: c.name, ok: false, error: '返回为 undefined' });
          console.log('❌ 无返回');
          continue;
        }
        const cnt = Array.isArray(res) ? res.length : (res && typeof res === 'object' ? 'object' : '-');
        summary.push({ name: c.name, ok: true, note: Array.isArray(res) ? String(res.length) : (res ? '有' : '空') });
        console.log(`✅ 有返回 (${cnt})`);
      } catch (e: any) {
        summary.push({ name: c.name, ok: false, error: e?.message || String(e) });
        console.log(`❌ 报错: ${e?.message || e}`);
      }
    }
  } else {
    console.log('  (跳过 getDeviceSummary / getInterfaces：无设备数据)');
    summary.push({ name: 'getDeviceSummary', ok: false, error: '无设备，未调用' });
    summary.push({ name: 'getInterfaces', ok: false, error: '无设备，未调用' });
  }

  // Business View 相关：先拿列表，再取第一个 BV 调 getBVDetails / getBusinessDetailsView
  process.stdout.write('  getBusinessView → 取第一个 BV 名称 ... ');
  try {
    const bvRes = await opClient.getBusinessView();
    const bvName =
      bvRes?.BusinessView?.Details?.[0]?.name ??
      bvRes?.Details?.[0]?.name ??
      (Array.isArray(bvRes) ? (bvRes[0] as any)?.name : null);
    if (!bvName) {
      summary.push({ name: 'getBVDetails(getBusinessDetailsView)', ok: false, error: '无业务视图名称，未调用' });
      console.log('⚠️ 无 BV 名称，跳过 getBVDetails / getBusinessDetailsView');
    } else {
      console.log(`✅ ${bvName}`);
      for (const method of ['getBVDetails', 'getBusinessDetailsView'] as const) {
        const label = `${method}(${bvName})`;
        process.stdout.write(`  ${label} ... `);
        try {
          const res = method === 'getBVDetails' ? await opClient.getBVDetails(bvName) : await opClient.getBusinessDetailsView(bvName);
          if (res === undefined || res === null) {
            summary.push({ name: label, ok: false, error: '返回为 undefined/null' });
            console.log('❌ 无返回');
          } else {
            summary.push({ name: label, ok: true, note: typeof res === 'object' ? 'object' : String(res) });
            console.log('✅ 有返回');
          }
        } catch (e: any) {
          summary.push({ name: label, ok: false, error: e?.message || String(e) });
          console.log(`❌ 报错: ${e?.message || e}`);
        }
      }
    }
  } catch (e: any) {
    summary.push({ name: 'getBusinessView(取BV名称)', ok: false, error: e?.message || String(e) });
    console.log(`❌ ${e?.message || e}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('汇总');
  console.log('='.repeat(80));
  const failed = summary.filter((s) => !s.ok);
  const passed = summary.filter((s) => s.ok);
  passed.forEach((s) => console.log(`  ✅ ${s.name}${s.note ? ` (${s.note})` : ''}`));
  failed.forEach((s) => console.log(`  ❌ ${s.name}: ${s.error}`));
  console.log('');
  if (failed.length > 0) {
    console.log(`存在 ${failed.length} 个调用无返回或报错，需检查 OpManager 地址、API 权限与网络。`);
    process.exitCode = 1;
  } else {
    console.log('所有已使用的 OpManager API 调用均有返回、未出现未处理报错。');
  }
  console.log('');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
