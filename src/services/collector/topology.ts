import { prisma } from '@/lib/prisma';
import { opClient } from '@/services/opmanager/client';
import { broadcaster } from '@/services/broadcast';

/**
 * 将 OpManager 流量字符串解析为 bps (BigInt)，用于写入 TrafficMetric。
 * 支持格式: "10.806 Mbps", "3.768 K", "69.148 M (0.0%)", "0 bps", "NA"
 */
function parseTrafficToBps(trafficStr: string | undefined): bigint {
  if (!trafficStr || trafficStr.trim() === '' || trafficStr.trim().toUpperCase() === 'NA') {
    return BigInt(0);
  }
  const trafficOnly = trafficStr.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
  const parts = trafficOnly.split(/\s+/);
  if (parts.length < 2) return BigInt(0);
  const value = parseFloat(parts[0]);
  if (Number.isNaN(value)) return BigInt(0);
  const unit = (parts[1] || '').toUpperCase();
  let multiplier = 1;
  if (unit === 'K' || unit === 'KB' || unit === 'KBPS' || unit === 'Kbps') {
    multiplier = 1000;
  } else if (unit === 'M' || unit === 'MB' || unit === 'MBPS' || unit === 'Mbps') {
    multiplier = 1000 * 1000;
  } else if (unit === 'G' || unit === 'GB' || unit === 'GBPS' || unit === 'Gbps') {
    multiplier = 1000 * 1000 * 1000;
  } else if (unit === 'T' || unit === 'TB' || unit === 'TBPS') {
    multiplier = 1000 * 1000 * 1000 * 1000;
  } else if (unit === 'BPS' || unit === 'bps') {
    multiplier = 1;
  }
  return BigInt(Math.round(value * multiplier));
}

export class TopologyCollector {
    async syncBusinessView(bvName: string) {
        console.log(`🔄 Syncing Business View: ${bvName}...`);
        let nodesCount = 0;
        let edgesCount = 0;
        try {
            // Fetch Topology from OpManager getBVDetails
            const topologyData = await opClient.getBVDetails(bvName);
            if (!topologyData) return { nodes: 0, edges: 0 };

            // ⚠️ 不再调用 getBusinessDetailsView
            // 设备状态和性能数据直接从 Device 表读取（由独立采集器维护）

            const { deviceProperties, linkProperties } = topologyData;

            // ⚠️ 关键：先保存所有现有节点的位置信息到内存，以便在删除后重新创建时保留位置
            console.log(`💾 Saving existing node positions for Business View: ${bvName}...`);
            const existingNodes = await prisma.topologyNode.findMany({
                where: { viewName: bvName },
                select: { id: true, positionX: true, positionY: true }
            });
            const positionMap = new Map(
                existingNodes.map(n => [n.id, { x: n.positionX, y: n.positionY }])
            );

            // 删除该业务视图的所有旧数据，确保数据库中只有 OpManager 返回的对象
            console.log(`🗑️  Cleaning old data for Business View: ${bvName}...`);
            await prisma.topologyEdge.deleteMany({ where: { viewName: bvName } });
            await prisma.topologyNode.deleteMany({ where: { viewName: bvName } });
            console.log(`✅ Old data cleaned, preserved ${positionMap.size} node positions`);

            // 1. Sync Nodes（不再获取 performance 数据，只存储拓扑结构）
            if (deviceProperties && Array.isArray(deviceProperties)) {
                for (const dev of deviceProperties) {
                    // Find existing device: 先按 opmanagerId，再按 IP
                    const opId = dev.objName || dev.name;
                    let device = await prisma.device.findUnique({
                        where: { opmanagerId: opId }
                    });
                    if (!device && (dev as any).ipAddress) {
                        device = await prisma.device.findFirst({
                            where: { ipAddress: (dev as any).ipAddress }
                        });
                    }
                    if (!device && (dev as any).IpAddress) {
                        device = await prisma.device.findFirst({
                            where: { ipAddress: (dev as any).IpAddress }
                        });
                    }

                    const nodeId = `${bvName}-${opId}`;

                    // Use saved positions from positionMap (before deletion)
                    const savedPosition = positionMap.get(nodeId);
                    const incomingX = parseFloat(dev.x || '0');
                    const incomingY = parseFloat(dev.y || '0');

                    // Preserve existing positions if they are non-zero,
                    // otherwise use incoming positions from API
                    const hasExistingPosition = savedPosition &&
                        (Math.abs(savedPosition.x) > 0.001 || Math.abs(savedPosition.y) > 0.001);

                    const finalX = hasExistingPosition ? savedPosition.x : incomingX;
                    const finalY = hasExistingPosition ? savedPosition.y : incomingY;

                    // 构造干净的 metadata，只保留 getBVDetails 的原始字段
                    // ⚠️ 不再包含 performance 数据
                    const cleanDev = { ...dev };
                    delete cleanDev.metadata; // 移除可能存在的嵌套 metadata

                    await prisma.topologyNode.upsert({
                        where: { id: nodeId },
                        update: {
                            viewName: bvName,
                            label: dev.label || dev.displayName,
                            type: dev.type,
                            positionX: finalX,
                            positionY: finalY,
                            icon: dev.iconName,
                            deviceId: device?.id,  // 关联到 Device 表
                            metadata: cleanDev     // 只存储拓扑相关数据
                        },
                        create: {
                            id: nodeId,
                            viewName: bvName,
                            label: dev.label || dev.displayName,
                            type: dev.type,
                            positionX: incomingX,
                            positionY: incomingY,
                            icon: dev.iconName,
                            deviceId: device?.id,  // 关联到 Device 表
                            metadata: cleanDev     // 只存储拓扑相关数据
                        }
                    });
                    nodesCount++;

                    // ⚠️ 不再从 getBusinessDetailsView 写入 DeviceMetric
                    // DeviceMetric 由独立的设备采集器维护
                }
            }

            // 2. Sync Edges（并在有接口时将 InTraffic/OutTraffic 写入 TrafficMetric，每接口每轮同步只写一条）
            const writtenInterfaceIds = new Set<string>();
            if (linkProperties && Array.isArray(linkProperties)) {
                for (const link of linkProperties) {
                    const sourceId = `${bvName}-${link.source}`;
                    const targetId = `${bvName}-${link.dest}`;
                    const edgeId = `${bvName}-${link.source}-${link.dest}-${link.name}`;

                    // Try to find the associated interface using multiple strategies
                    // Strategy 1: Match by opmanagerId (exact match with objName)
                    let intf = await prisma.interface.findFirst({
                        where: { opmanagerId: link.objName }
                    });

                    // Strategy 2: Match by device IP + interface description
                    // OpManager's objName format: IF-{IP}-{number}, parentName is the device IP
                    if (!intf && link.parentName && link.desc) {
                        const device = await prisma.device.findFirst({
                            where: { ipAddress: link.parentName }
                        });

                        if (device) {
                            intf = await prisma.interface.findFirst({
                                where: {
                                    deviceId: device.id,
                                    name: link.desc
                                }
                            });
                        }
                    }

                    await prisma.topologyEdge.upsert({
                        where: { id: edgeId },
                        update: {
                            viewName: bvName,
                            sourceId: sourceId,
                            targetId: targetId,
                            label: link.intfDisplayName || link.ifName,
                            type: (link as any).linkType || (link as any).type || '1',
                            interfaceId: intf?.id,
                            metadata: link
                        },
                        create: {
                            id: edgeId,
                            viewName: bvName,
                            sourceId: sourceId,
                            targetId: targetId,
                            label: link.intfDisplayName || link.ifName,
                            type: (link as any).linkType || (link as any).type || '1',
                            interfaceId: intf?.id,
                            metadata: link
                        }
                    });
                    edgesCount++;

                    // 将进入/出口流量写入 TrafficMetric（每接口每轮同步只写一条，避免重复）
                    const inTrafficStr = (link as any).InTraffic ?? (link as any).destProps?.InTraffic;
                    const outTrafficStr = (link as any).OutTraffic ?? (link as any).destProps?.OutTraffic;
                    if (
                        intf &&
                        (inTrafficStr || outTrafficStr) &&
                        !writtenInterfaceIds.has(intf.id)
                    ) {
                        const inBps = parseTrafficToBps(inTrafficStr);
                        const outBps = parseTrafficToBps(outTrafficStr);
                        try {
                            await prisma.trafficMetric.create({
                                data: {
                                    interfaceId: intf.id,
                                    inBandwidth: inBps,
                                    outBandwidth: outBps,
                                    timestamp: new Date()
                                }
                            });
                            writtenInterfaceIds.add(intf.id);
                        } catch (err) {
                            console.warn(
                                `⚠️ TrafficMetric create skipped for interface ${intf.id} (edge ${edgeId}):`,
                                err instanceof Error ? err.message : err
                            );
                        }
                    }
                }
            }

            console.log(
                `✅ Business View ${bvName} synced:`
            );
            console.log(`   - Nodes: ${nodesCount}`);
            console.log(`   - Edges: ${edgesCount}`);
            console.log(`   - TrafficMetric: ${writtenInterfaceIds.size} 条`);
            console.log(`   ⚠️  设备状态来自 Device 表（由独立采集器维护）`);

            // Broadcast topology update for realtime dashboard
            await broadcaster.emit('topology', 'topology:updated', {
                businessView: bvName,
                nodes: nodesCount,
                edges: edgesCount,
                timestamp: Date.now()
            });

            await broadcaster.emit(`business-view:${bvName}`, 'topology:updated', {
                nodes: nodesCount,
                edges: edgesCount,
                timestamp: Date.now()
            });
            return { nodes: nodesCount, edges: edgesCount };
        } catch (error) {
            console.error(`❌ Failed to sync Business View ${bvName}:`, error);
            return { nodes: nodesCount, edges: edgesCount };
        }
    }
}

export const topologyCollector = new TopologyCollector();
