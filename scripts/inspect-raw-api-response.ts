import { opClient } from '../src/services/opmanager/client';

async function main() {
  console.log('🔍 检查 OpManager API 原始返回数据\n');

  const bvName = '新的业务视图';

  console.log(`📡 调用 getBVDetails("${bvName}")...\n`);
  const topologyData = await opClient.getBVDetails(bvName);

  if (!topologyData || !topologyData.deviceProperties) {
    console.log('❌ 无法获取拓扑数据');
    return;
  }

  console.log(`✅ 获取到 ${topologyData.deviceProperties.length} 个设备节点\n`);

  // 检查前3个设备的原始数据结构
  for (let i = 0; i < Math.min(3, topologyData.deviceProperties.length); i++) {
    const dev = topologyData.deviceProperties[i];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`设备 ${i + 1}: ${dev.label || dev.displayName || dev.objName}`);
    console.log(`${'='.repeat(60)}`);

    console.log('\n字段列表:');
    const keys = Object.keys(dev);
    console.log(`  共 ${keys.length} 个字段:`, keys.join(', '));

    console.log('\n关键字段值:');
    console.log(`  objName: ${dev.objName}`);
    console.log(`  label: ${dev.label}`);
    console.log(`  type: ${dev.type}`);
    console.log(`  status: ${dev.status}`);
    console.log(`  statusStr: ${dev.statusStr}`);

    // 检查是否有 metadata 字段
    if ('metadata' in dev) {
      console.log(`\n  ⚠️  发现 metadata 字段！`);
      console.log(`  metadata 类型: ${typeof dev.metadata}`);
      if (typeof dev.metadata === 'object') {
        const metaKeys = Object.keys(dev.metadata as any);
        console.log(`  metadata 字段数: ${metaKeys.length}`);
        console.log(`  metadata 字段: ${metaKeys.slice(0, 10).join(', ')}`);

        // 检查是否有嵌套的 metadata.metadata
        const metadata = dev.metadata as any;
        if (metadata.metadata) {
          console.log(`  ❌ 检测到嵌套 metadata.metadata！`);
        }
      }
    } else {
      console.log(`\n  ✅ 没有 metadata 字段（正常）`);
    }

    console.log(`\n完整数据结构 (JSON):`);
    console.log(JSON.stringify(dev, null, 2).substring(0, 500) + '...\n');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 总结');
  console.log('='.repeat(60));

  const hasMetadataField = topologyData.deviceProperties.some((d: any) => 'metadata' in d);

  if (hasMetadataField) {
    console.log(`❌ OpManager API 返回的数据中包含 metadata 字段`);
    console.log(`   这是导致嵌套的根本原因！`);
  } else {
    console.log(`✅ OpManager API 返回的数据中不包含 metadata 字段`);
    console.log(`   嵌套问题来自我们的代码逻辑`);
  }
}

main().catch(console.error);
