/**
 * 诊断拓扑图标：检查 API 返回的节点类型与 Device 表是否一致
 * 运行: npx ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-topology-icons.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bvName = process.argv[2] || 'TEST2';
  console.log(`\n=== 拓扑图标诊断 (bvName=${bvName}) ===\n`);

  const nodes = await prisma.topologyNode.findMany({
    where: { viewName: bvName },
    include: { device: { select: { id: true, type: true, ipAddress: true, displayName: true } } },
  });

  if (nodes.length === 0) {
    console.log('未找到拓扑节点。请确认业务视图名称正确且已同步拓扑。');
    return;
  }

  const unlinkedIps = nodes
    .filter((n) => !n.deviceId)
    .map((n) => {
      const meta = (n.metadata as Record<string, unknown>) || {};
      return (meta.ipAddress ?? meta.IpAddress) as string | undefined;
    })
    .filter((ip): ip is string => !!ip && ip.trim() !== '');

  let deviceByIp = new Map<string, { type: string }>();
  if (unlinkedIps.length > 0) {
    const devices = await prisma.device.findMany({
      where: { ipAddress: { in: [...new Set(unlinkedIps)] } },
      select: { ipAddress: true, type: true },
    });
    devices.forEach((d) => deviceByIp.set(d.ipAddress, { type: d.type }));
  }

  console.log('节点 | 标签 | TopologyNode.type | Device.type (关联) | Device.type (IP查) | 最终 type → 图标');
  console.log('-'.repeat(100));

  for (const node of nodes) {
    const meta = (node.metadata as Record<string, unknown>) || {};
    const metaType = (meta.type ?? meta.deviceType ?? meta.Type) as string | undefined;
    const ip = (meta.ipAddress ?? meta.IpAddress ?? node.device?.ipAddress) as string | undefined;
    const typeFromDeviceByIp = ip ? deviceByIp.get(ip)?.type : undefined;
    const resolvedType =
      node.device?.type ?? typeFromDeviceByIp ?? node.type ?? metaType ?? 'default';

    const icon =
      resolvedType && /server|storage|load_balancer/i.test(resolvedType)
        ? 'ServerRack'
        : resolvedType && /switch|router|firewall/i.test(resolvedType)
          ? 'Switch'
          : resolvedType && /printer|workstation|pc|host/i.test(resolvedType)
            ? 'Workstation'
            : 'Switch(default)';

    console.log(
      [
        node.id.slice(-8),
        (node.label || '').slice(0, 20).padEnd(20),
        (node.type || '—').slice(0, 20).padEnd(20),
        (node.device?.type ?? '—').padEnd(18),
        (typeFromDeviceByIp ?? '—').padEnd(18),
        `${resolvedType} → ${icon}`,
      ].join(' | ')
    );
  }

  console.log('\n说明: 最终 type 来自 Device 表时，图标应按 SERVER/SWITCH 等正确显示。');
  console.log('若大量为 default 或 OpManager 类型，请检查: 1) 设备同步 2) admin/devices 类型配置 3) 拓扑同步');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
