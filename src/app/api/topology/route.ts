import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering since this route uses request parameters
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const viewName = req.nextUrl.searchParams.get('bvName');

    // If no viewName (global view), fetch ALL topology data
    // Condition object for Prisma filter
    const whereClause = (viewName && viewName !== '') ? { viewName } : {};

    // 获取业务视图配置（包含相机状态）- Only if viewName exists
    const viewConfig = (viewName && viewName !== '')
      ? await prisma.businessViewConfig.findUnique({
        where: { name: viewName },
        select: {
          cameraX: true,
          cameraY: true,
          cameraZoom: true
        }
      })
      : null;

    const nodes = await prisma.topologyNode.findMany({
      where: whereClause,
      include: {
        device: {
          include: {
            metrics: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // 未关联 Device 的节点：按 IP 批量查找 Device 表，补充类型
    const unlinkedIps = nodes
      .filter((n) => !n.deviceId)
      .map((n) => {
        const meta = (n.metadata as Record<string, unknown>) || {};
        return (meta.ipAddress ?? meta.IpAddress ?? n.device?.ipAddress) as string | undefined;
      })
      .filter((ip): ip is string => !!ip && ip.trim() !== '');
    const deviceByIp = new Map<string, { type: string }>();
    if (unlinkedIps.length > 0) {
      const devices = await prisma.device.findMany({
        where: { ipAddress: { in: [...new Set(unlinkedIps)] } },
        select: { ipAddress: true, type: true }
      });
      devices.forEach((d) => deviceByIp.set(d.ipAddress, { type: d.type }));
    }

    // ✅ 只需要 metadata 字段，不需要关联 interface 和 trafficMetrics
    const edges = await prisma.topologyEdge.findMany({
      where: whereClause
    });

    // Transform for ReactFlow; 节点状态：优先 node.device?.status，否则从 metadata 解析（与 OPM 一致）
    // OpManager 状态码: 1=严重 2=问题 3=注意 4=服务中断 5=正常 7=未管理
    const rfNodes = nodes.map(node => {
      const latestMetric = node.device?.metrics[0];
      const meta = (node.metadata as Record<string, unknown>) || {};
      const rawStatus = meta.status ?? meta.statusNum ?? (meta as Record<string, unknown>).Status;
      const metaStatus = String(rawStatus ?? '5').trim();
      const statusFromMeta =
        metaStatus === '5'
          ? 'ONLINE'
          : metaStatus === '1'
            ? 'ERROR'
            : metaStatus === '2' || metaStatus === '3'
              ? 'WARNING'
              : metaStatus === '4' || metaStatus === '7'
                ? 'OFFLINE'
                : metaStatus === '6'
                  ? 'UNMANAGED'
                  : undefined;
      const status = node.device?.status ?? statusFromMeta ?? 'ONLINE';
      const metaType = (meta.type ?? meta.deviceType ?? meta.Type) as string | undefined;
      const ip = (meta.ipAddress ?? meta.IpAddress ?? node.device?.ipAddress) as string | undefined;
      const typeFromDeviceByIp = ip ? deviceByIp.get(ip)?.type : undefined;
      // 优先使用 Device 表类型（admin/devices 配置），含 deviceId 关联和 IP 备用查找
      const resolvedType = node.device?.type ?? typeFromDeviceByIp ?? node.type ?? metaType ?? 'default';
      return {
        id: node.id,
        type: 'device',
        position: { x: node.positionX, y: node.positionY },
        data: {
          label: node.label,
          type: resolvedType,
          icon: node.icon,
          status,
          deviceId: node.deviceId ?? undefined,
          ip: node.device?.ipAddress ?? (meta.ipAddress as string),
          cpu: latestMetric?.cpuUsage || 0,
          memory: latestMetric?.memoryUsage || 0,
          metadata: node.metadata
        }
      };
    });

    const rfEdges = edges.map(edge => {
      const metadata = edge.metadata as any;

      // ✅ 直接使用 getBVDetails 返回的 InTraffic/OutTraffic
      const inTrafficRaw = metadata?.InTraffic ?? metadata?.destProps?.InTraffic;
      const outTrafficRaw = metadata?.OutTraffic ?? metadata?.destProps?.OutTraffic;

      // 格式化 OpManager 流量字符串（移除单位，统一格式）
      const norm = (s: string | undefined) =>
        s ? s.replace(/ bps/i, '').replace(/ Kbps/i, 'K').replace(/ Mbps/i, 'M').replace(/ Gbps/i, 'G').trim() : '0';

      let trafficLabel = '';
      // ✅ 直接使用 getBVDetails 返回的流量数据，不使用 TrafficMetric 表
      if (inTrafficRaw || outTrafficRaw) {
        trafficLabel = `↓${norm(inTrafficRaw)} ↑${norm(outTrafficRaw)}`;
      } else if (metadata?.intfDisplayName || metadata?.ifName) {
        trafficLabel = metadata.intfDisplayName || metadata.ifName;
      } else if (edge.label) {
        trafficLabel = edge.label;
      } else {
        trafficLabel = '—';
      }

      // OPM 链接状态: 1/2 关闭/停止→红, 3 其他→黄, 4/7 取消管理→灰, 5 正常→绿
      const linkStatus = String((metadata?.status ?? '5'));
      const strokeColor =
        linkStatus === '1' || linkStatus === '2'
          ? '#ef4444'
          : linkStatus === '3'
            ? '#eab308'
            : linkStatus === '4' || linkStatus === '7'
              ? '#6b7280'
              : '#22c55e';

      return {
        id: edge.id,
        type: 'customEdge',
        source: edge.sourceId,
        target: edge.targetId,
        label: trafficLabel,
        animated: false, // ✅ 移除 latestMetric 依赖，可以后续根据流量利用率判断
        style: {
          stroke: strokeColor,
          strokeWidth: 2
        },
        data: {
          status: linkStatus,
          inTraffic: trafficLabel,
          outTraffic: outTrafficRaw ?? metadata?.OutTraffic,
          smoothType: metadata?.smoothType
        }
      };
    });

    return NextResponse.json({
      nodes: rfNodes,
      edges: rfEdges,
      camera: viewConfig ? {
        x: viewConfig.cameraX,
        y: viewConfig.cameraY,
        ratio: viewConfig.cameraZoom
      } : null
    });
  } catch (error) {
    console.error('Failed to fetch topology:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
