import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 修复拓扑节点与设备的关联\n');

  // 获取所有拓扑节点
  const nodes = await prisma.topologyNode.findMany({
    include: {
      device: true,
    },
  });

  console.log(`找到 ${nodes.length} 个拓扑节点\n`);

  let fixedCount = 0;
  let notFoundCount = 0;

  for (const node of nodes) {
    // 如果已经有 deviceId，跳过
    if (node.deviceId) {
      console.log(`✓ ${node.label} - 已关联设备`);
      continue;
    }

    // 从 metadata 中提取设备名称和 IP（深入嵌套结构）
    const metadata = node.metadata as any;

    // 递归查找最深层的 metadata
    let deepMeta = metadata;
    while (deepMeta?.metadata && typeof deepMeta.metadata === 'object') {
      deepMeta = deepMeta.metadata;
    }

    const deviceName = deepMeta?.objName || deepMeta?.name || metadata?.name;
    const deviceIp = deepMeta?.performance?.IpAddress || deepMeta?.IpAddress || metadata?.ip;
    const displayName = deepMeta?.performance?.displayName || node.label;

    if (!deviceName && !deviceIp) {
      console.log(`⚠️  ${node.label} - 无法找到设备标识`);
      notFoundCount++;
      continue;
    }

    // 尝试通过名称或 IP 查找设备
    const device = await prisma.device.findFirst({
      where: {
        OR: [
          { name: deviceName },
          { ipAddress: deviceIp },
          { displayName: node.label },
          { displayName: displayName },
        ],
      },
    });

    if (device) {
      // 更新拓扑节点，关联到设备
      await prisma.topologyNode.update({
        where: { id: node.id },
        data: { deviceId: device.id },
      });

      console.log(`✅ ${node.label} → 关联到设备: ${device.displayName} (${device.status})`);
      fixedCount++;
    } else {
      console.log(`❌ ${node.label} - 找不到对应设备 (name: ${deviceName}, ip: ${deviceIp})`);
      notFoundCount++;
    }
  }

  console.log(`\n=== 修复完成 ===`);
  console.log(`✅ 成功关联: ${fixedCount} 个节点`);
  console.log(`❌ 无法关联: ${notFoundCount} 个节点`);
  console.log(`\n请刷新拓扑图查看效果！`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
