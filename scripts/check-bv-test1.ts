/**
 * 检查是否存在 TEST1 业务视图，以及 getBVDetails 是否返回其拓扑
 */

import { config } from 'dotenv';

config({ path: '.env.local', override: true });

async function run() {
  const bvName = process.argv[2] || 'TEST2_bv';
  console.log('\n' + '='.repeat(60));
  console.log(`检查业务视图 "${bvName}" 的拓扑是否被返回`);
  console.log('='.repeat(60) + '\n');

  const { opClient } = await import('../src/services/opmanager/client');

  // 1. 获取业务视图列表
  console.log('1. 调用 getBusinessView() 获取业务视图列表...\n');
  let bvList: any = null;
  try {
    bvList = await opClient.getBusinessView();
  } catch (e: any) {
    console.error('❌ getBusinessView 报错:', e?.message || e);
    process.exit(1);
  }

  const details = bvList?.BusinessView?.Details ?? bvList?.Details ?? (Array.isArray(bvList) ? bvList : []);
  const names: string[] = Array.isArray(details) ? details.map((d: any) => d.name ?? d.displayName ?? '').filter(Boolean) : [];

  console.log('   当前业务视图名称列表:');
  if (names.length === 0) {
    console.log('   (无) 或 结构非预期:', Object.keys(bvList || {}));
  } else {
    names.forEach((n, i) => console.log(`   ${i + 1}. ${n}`));
  }

  const exists = names.some((n) => n === bvName || n.toLowerCase() === bvName.toLowerCase());
  console.log(`\n   是否存在 "${bvName}": ${exists ? '是' : '否'}\n`);

  // 2. 调用 getBVDetails(TEST1)
  console.log(`2. 调用 getBVDetails("${bvName}")...\n`);
  let detailsRes: any = null;
  try {
    detailsRes = await opClient.getBVDetails(bvName);
  } catch (e: any) {
    console.error('❌ getBVDetails 报错:', e?.message || e);
    process.exit(1);
  }

  if (detailsRes == null) {
    console.log('   ❌ 返回为 null/undefined，未返回该业务视图的拓扑。');
    console.log('   （常见原因：视图名不存在、权限不足或接口失败）\n');
    process.exitCode = 1;
    return;
  }

  const devices = detailsRes.deviceProperties;
  const links = detailsRes.linkProperties;
  const hasDevices = Array.isArray(devices) && devices.length > 0;
  const hasLinks = Array.isArray(links) && links.length >= 0;

  console.log('   返回结构:');
  console.log(`   - deviceProperties: ${Array.isArray(devices) ? devices.length : '非数组'} 个节点`);
  console.log(`   - linkProperties:   ${Array.isArray(links) ? links.length : '非数组'} 条边`);
  console.log(`   - mapProperties:   ${detailsRes.mapProperties ? '有' : '无'}`);
  console.log('');

  if (hasDevices || hasLinks) {
    console.log(`   ✅ 已返回 "${bvName}" 的拓扑（节点 ${devices?.length ?? 0}，边 ${links?.length ?? 0}）。`);
    if (hasDevices && devices.length > 0) {
      console.log('\n   前 3 个节点示例:');
      devices.slice(0, 3).forEach((d: any, i: number) => {
        console.log(`     ${i + 1}. objName=${d.objName ?? d.name} label=${d.label ?? d.displayName} type=${d.type} x=${d.x} y=${d.y}`);
      });
    }
    if (hasLinks && links.length > 0) {
      console.log('\n   前 3 条边示例:');
      links.slice(0, 3).forEach((l: any, i: number) => {
        console.log(`     ${i + 1}. source=${l.source} dest=${l.dest} name=${l.name?.slice?.(0, 30)}`);
      });
    }
  } else {
    console.log(`   ⚠️ 返回了对象，但 deviceProperties/linkProperties 为空或非数组，未包含有效拓扑。`);
    process.exitCode = 1;
  }

  console.log('');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
