/**
 * 同步逻辑验证脚本
 * 用途：确认「从 OpManager 拉取 → 状态映射 → 落库」全链路是否符合预期
 * - Trouble 必须映射为 ERROR，不能为 OFFLINE
 * - UnManaged 必须映射为 UNMANAGED，不能为 OFFLINE
 * - 只有 Down 才映射为 OFFLINE
 */

import { config } from 'dotenv';

config({ path: '.env.local', override: true });

async function main() {
  console.log('\n' + '='.repeat(90));
  console.log('同步逻辑验证：OpManager 原始状态 → 本系统映射规则 → 预期结果');
  console.log('='.repeat(90) + '\n');

  // 与 device 同步、full-production-sync 完全一致的映射规则（用于对照）
  function mapDeviceStatus(opManagerStatus: string): string {
    const s = (opManagerStatus || '').toLowerCase();
    if (s.includes('critical')) return 'ERROR';
    if (s.includes('trouble')) return 'ERROR';
    if (s.includes('attention') || s.includes('warning') || s.includes('warn')) return 'WARNING';
    if (s.includes('down')) return 'OFFLINE';
    if (s.includes('unmanaged')) return 'UNMANAGED';
    if (s.includes('clear') || s.includes('up')) return 'ONLINE';
    return 'ONLINE';
  }

  function getIsMonitored(opStatus: string, opIsManaged: unknown): boolean {
    const raw = opIsManaged;
    if (raw === undefined) return (opStatus || '').toLowerCase() !== 'unmanaged';
    return String(raw).toLowerCase() === 'true';
  }

  console.log('📋 映射规则（与 device 同步 / full-production-sync 一致）');
  console.log('   OpManager statusStr  →  本系统 status');
  console.log('   ─────────────────────────────────────────');
  console.log('   Critical             →  ERROR');
  console.log('   Trouble              →  ERROR  （不可为 OFFLINE）');
  console.log('   Attention / Warning  →  WARNING');
  console.log('   Down                 →  OFFLINE （仅“真正离线”用 OFFLINE）');
  console.log('   UnManaged            →  UNMANAGED （不可为 OFFLINE）');
  console.log('   Clear / Up           →  ONLINE');
  console.log('');

  const baseUrl = process.env.OPMANAGER_BASE_URL;
  const apiKey = process.env.OPMANAGER_API_KEY;
  if (!baseUrl || !apiKey) {
    console.error('❌ 缺少 OPMANAGER_BASE_URL 或 OPMANAGER_API_KEY');
    process.exit(1);
  }

  const { default: axios } = await import('axios');
  const https = await import('https');
  const agent = new https.Agent({ rejectUnauthorized: false });

  console.log('📡 从 OpManager 拉取设备列表（与同步时相同 API）...\n');

  const res = await axios.get(`${baseUrl}/api/json/v2/device/listDevices`, {
    params: { apiKey, rows: 100 },
    headers: { apiKey },
    httpsAgent: agent,
    timeout: 60000,
  });

  const rows = res.data?.rows ?? res.data?.devices ?? [];
  if (rows.length === 0) {
    console.log('⚠️ 未拿到任何设备，请检查 API 或权限');
    return;
  }

  console.log(`   共 ${rows.length} 台设备\n`);
  console.log('─'.repeat(90));
  console.log('设备名'.padEnd(28) + 'IP'.padEnd(18) + 'statusStr'.padEnd(14) + '→ status'.padEnd(12) + 'isMonitored');
  console.log('─'.repeat(90));

  const byMappedStatus: Record<string, number> = {};
  for (const d of rows) {
    const name = (d.deviceName ?? d.name ?? d.ipaddress ?? '').toString().slice(0, 26);
    const ip = (d.ipaddress ?? d.ipAddress ?? '').toString().slice(0, 16);
    const statusStr = (d.statusStr ?? d.status ?? '').toString();
    const isManaged = d.isManaged;
    const mapped = mapDeviceStatus(statusStr);
    const isMonitored = getIsMonitored(statusStr, isManaged);

    byMappedStatus[mapped] = (byMappedStatus[mapped] ?? 0) + 1;
    const ok = (statusStr.toLowerCase().includes('trouble') && mapped !== 'ERROR') || (statusStr.toLowerCase().includes('unmanaged') && mapped === 'OFFLINE')
      ? ' ❌ 映射异常'
      : '';
    console.log(name.padEnd(28) + ip.padEnd(18) + statusStr.padEnd(14) + (`${mapped}`.padEnd(12) + String(isMonitored)) + ok);
  }

  console.log('─'.repeat(90));
  console.log('\n📊 按映射后 status 统计:');
  Object.entries(byMappedStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, n]) => console.log(`   ${status}: ${n}`));

  // 若 DB 可连，对比同步后的真实库内分布
  try {
    const { prisma } = await import('../src/lib/prisma');
    const dist = await prisma.device.groupBy({ by: ['status'], _count: true });
    console.log('\n📦 当前库内设备 status 分布（同步后）:');
    dist.forEach(({ status, _count }) => console.log(`   ${status}: ${_count}`));
    await prisma.$disconnect();
  } catch (e) {
    console.log('\n⚠️ 未连接数据库，仅展示“按当前规则会得到的”映射结果');
  }

  console.log('\n' + '='.repeat(90));
  console.log('结论');
  console.log('='.repeat(90));
  console.log('  - 若 Trouble 设备出现在“→ status”列为 ERROR，且库内为 ERROR，则逻辑正确。');
  console.log('  - 若 UnManaged 设备出现在“→ status”列为 UNMANAGED，且库内为 UNMANAGED，则逻辑正确。');
  console.log('  - 仅当 statusStr 为 Down 时，才应出现 OFFLINE。');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
